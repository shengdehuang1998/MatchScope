import { createHash, randomBytes, randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  CreateMatchBodySchema,
  CreatePromptBodySchema,
  CreatePromptVersionBodySchema,
  LoginBodySchema,
  MatchListQuerySchema,
  RefreshBodySchema,
  UpdateMatchBodySchema,
  UpdateSettingsBodySchema,
  type MatchDto,
  type PromptTemplateDto,
  type UserSettingsDto,
} from '@match-insight/contracts';
import type {
  AppStore,
  MatchRecord,
  PromptTemplateRecord,
  UserRecord,
} from '@match-insight/domain';
import {
  DomainError,
  DomainErrorCodes,
  normalizeEmail,
  parseFutureKickoff,
  requireNonBlank,
  validateIanaTimezone,
  validateTeams,
} from '@match-insight/domain';
import { Type } from '@sinclair/typebox';
import { hash, verify } from 'argon2';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { ApiConfig } from './config.js';

interface AuthPayload {
  sub: string;
  sessionId: string;
}
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => randomBytes(48).toString('base64url');
const sessionExpiry = (config: ApiConfig) =>
  new Date(Date.now() + config.refreshTokenTtlDays * 86_400_000);
const publicUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

function matchDto(row: MatchRecord): MatchDto {
  return {
    id: row.id,
    league: row.league,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    kickoffAt: row.kickoffAt.toISOString(),
    inputTimezone: row.inputTimezone,
    supplementalMaterial: row.supplementalMaterial,
    promptVersionId: row.promptVersionId,
    status: row.status,
    scheduleVersion: row.scheduleVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function promptDto(row: PromptTemplateRecord): PromptTemplateDto {
  const versionDto = (version: NonNullable<PromptTemplateRecord['currentVersion']>) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    content: version.content,
    createdAt: version.createdAt.toISOString(),
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    currentVersion: row.currentVersion ? versionDto(row.currentVersion) : null,
    ...(row.versions ? { versions: row.versions.map(versionDto) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function buildApp(store: AppStore, config: ApiConfig) {
  const app = Fastify({
    logger: { redact: ['req.headers.authorization', 'body.password', 'body.refreshToken'] },
    genReqId: () => randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();
  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)),
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: config.jwtAccessSecret });
  await app.register(swagger, { openapi: { info: { title: 'MatchScope API', version: '1.0.0' } } });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError)
      return reply
        .status(error.statusCode)
        .send({ code: error.code, message: error.message, requestId: request.id });
    if (typeof error === 'object' && error !== null && 'validation' in error && error.validation)
      return reply.status(400).send({
        code: DomainErrorCodes.validation,
        message: '请求参数不正确',
        requestId: request.id,
      });
    request.log.error(error);
    return reply
      .status(500)
      .send({ code: 'INTERNAL_ERROR', message: '服务器内部错误', requestId: request.id });
  });

  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify<AuthPayload>();
      const payload = auth(request);
      const session = await store.findSessionById(payload.sessionId);
      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw new Error('SESSION_NOT_ACTIVE');
    } catch {
      return reply
        .status(401)
        .send({ code: DomainErrorCodes.unauthorized, message: '请先登录', requestId: request.id });
    }
  }
  const auth = (request: FastifyRequest) => request.user as AuthPayload;
  const metadata = (request: FastifyRequest) => ({
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });
  const signAccessToken = (userId: string, sessionId: string) =>
    app.jwt.sign({ sessionId }, { sub: userId, expiresIn: config.accessTokenTtlMinutes * 60 });

  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    try {
      await store.ready();
      return { status: 'ready' };
    } catch {
      return reply.status(503).send({ status: 'not_ready' });
    }
  });

  app.post(
    '/api/v1/auth/register',
    {
      schema: { body: LoginBodySchema },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const email = normalizeEmail(request.body.email);
      if (await store.findUserByEmail(email))
        throw new DomainError('EMAIL_ALREADY_EXISTS', '该邮箱已注册，请直接登录', 409);
      const user = await store.createUser({
        email,
        passwordHash: await hash(request.body.password),
      });
      if (!user) throw new DomainError('EMAIL_ALREADY_EXISTS', '该邮箱已注册，请直接登录', 409);
      return reply.status(201).send({ user: publicUser(user) });
    },
  );

  app.post(
    '/api/v1/auth/login',
    {
      schema: { body: LoginBodySchema },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const user = await store.findUserByEmail(normalizeEmail(request.body.email));
      const valid = user?.isActive
        ? await verify(user.passwordHash, request.body.password).catch(() => false)
        : false;
      if (!user || !valid)
        throw new DomainError(DomainErrorCodes.invalidCredentials, '邮箱或密码不正确', 401);
      const refreshToken = newRefreshToken();
      const session = await store.createSession({
        userId: user.id,
        refreshTokenHash: tokenHash(refreshToken),
        expiresAt: sessionExpiry(config),
        deviceName: request.body.deviceName,
        ...metadata(request),
      });
      return reply.send({
        user: publicUser(user),
        tokens: {
          accessToken: signAccessToken(user.id, session.id),
          refreshToken,
          expiresInSeconds: config.accessTokenTtlMinutes * 60,
        },
      });
    },
  );

  app.post('/api/v1/auth/refresh', { schema: { body: RefreshBodySchema } }, async (request) => {
    const session = await store.findSessionByTokenHash(tokenHash(request.body.refreshToken));
    if (!session || session.revokedAt || session.expiresAt <= new Date())
      throw new DomainError(DomainErrorCodes.invalidCredentials, '刷新令牌无效', 401);
    const user = await store.findUserById(session.userId);
    if (!user?.isActive)
      throw new DomainError(DomainErrorCodes.invalidCredentials, '刷新令牌无效', 401);
    const refreshToken = newRefreshToken();
    const replacement = await store.rotateSession(session.id, {
      refreshTokenHash: tokenHash(refreshToken),
      expiresAt: sessionExpiry(config),
      ...metadata(request),
    });
    return {
      accessToken: signAccessToken(user.id, replacement.id),
      refreshToken,
      expiresInSeconds: config.accessTokenTtlMinutes * 60,
    };
  });

  app.post('/api/v1/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    const payload = auth(request);
    await store.revokeSession(payload.sessionId, payload.sub);
    return reply.status(204).send();
  });
  app.get('/api/v1/auth/me', { preHandler: authenticate }, async (request) => {
    const user = await store.findUserById(auth(request).sub);
    if (!user) throw new DomainError(DomainErrorCodes.unauthorized, '登录状态无效', 401);
    return publicUser(user);
  });

  app.get(
    '/api/v1/matches',
    { preHandler: authenticate, schema: { querystring: MatchListQuerySchema } },
    async (request) => {
      const rows = await store.listMatches(auth(request).sub, {
        status: request.query.status,
        from: request.query.from ? new Date(request.query.from) : undefined,
        to: request.query.to ? new Date(request.query.to) : undefined,
        limit: request.query.limit ?? 20,
        offset: request.query.offset ?? 0,
      });
      return { data: rows.map(matchDto) };
    },
  );

  app.post(
    '/api/v1/matches',
    { preHandler: authenticate, schema: { body: CreateMatchBodySchema } },
    async (request, reply) => {
      const userId = auth(request).sub;
      validateTeams(request.body.homeTeam, request.body.awayTeam);
      const kickoffAt = parseFutureKickoff(request.body.kickoffAt);
      const inputTimezone = validateIanaTimezone(request.body.inputTimezone);
      if (!(await store.promptVersionBelongsToUser(userId, request.body.promptVersionId)))
        throw new DomainError(DomainErrorCodes.promptVersionNotFound, '分析模板版本不存在', 404);
      const row = await store.createMatch(userId, {
        league: requireNonBlank(request.body.league, '联赛'),
        homeTeam: request.body.homeTeam.trim(),
        awayTeam: request.body.awayTeam.trim(),
        kickoffAt,
        inputTimezone,
        supplementalMaterial: request.body.supplementalMaterial?.trim(),
        promptVersionId: request.body.promptVersionId,
        status: request.body.status ?? 'scheduled',
      });
      return reply.status(201).send(matchDto(row));
    },
  );

  app.get(
    '/api/v1/matches/:id',
    { preHandler: authenticate, schema: { params: IdParamsSchema } },
    async (request) => {
      const row = await store.findMatch(auth(request).sub, request.params.id);
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '比赛不存在', 404);
      return matchDto(row);
    },
  );

  app.patch(
    '/api/v1/matches/:id',
    { preHandler: authenticate, schema: { params: IdParamsSchema, body: UpdateMatchBodySchema } },
    async (request) => {
      const userId = auth(request).sub;
      const existing = await store.findMatch(userId, request.params.id);
      if (!existing) throw new DomainError(DomainErrorCodes.notFound, '比赛不存在', 404);
      if (
        existing.status === 'cancelled' ||
        existing.status === 'finished' ||
        existing.kickoffAt <= new Date()
      )
        throw new DomainError(
          DomainErrorCodes.matchNotEditable,
          '比赛已开始、已取消或已结束，不能编辑',
          409,
        );
      validateTeams(
        request.body.homeTeam ?? existing.homeTeam,
        request.body.awayTeam ?? existing.awayTeam,
      );
      if (
        request.body.promptVersionId &&
        !(await store.promptVersionBelongsToUser(userId, request.body.promptVersionId))
      )
        throw new DomainError(DomainErrorCodes.promptVersionNotFound, '分析模板版本不存在', 404);
      const requestedKickoff = request.body.kickoffAt
        ? parseFutureKickoff(request.body.kickoffAt)
        : undefined;
      const kickoffAt =
        requestedKickoff?.getTime() === existing.kickoffAt.getTime() ? undefined : requestedKickoff;
      const row = await store.updateMatch(userId, request.params.id, {
        ...request.body,
        league: request.body.league?.trim(),
        homeTeam: request.body.homeTeam?.trim(),
        awayTeam: request.body.awayTeam?.trim(),
        kickoffAt,
        inputTimezone: request.body.inputTimezone
          ? validateIanaTimezone(request.body.inputTimezone)
          : undefined,
      });
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '比赛不存在', 404);
      return matchDto(row);
    },
  );

  app.post(
    '/api/v1/matches/:id/cancel',
    { preHandler: authenticate, schema: { params: IdParamsSchema } },
    async (request) => {
      const existing = await store.findMatch(auth(request).sub, request.params.id);
      if (!existing) throw new DomainError(DomainErrorCodes.notFound, '比赛不存在', 404);
      if (existing.status === 'finished')
        throw new DomainError(DomainErrorCodes.matchNotEditable, '已结束的比赛不能取消', 409);
      const row = await store.cancelMatch(auth(request).sub, request.params.id);
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '比赛不存在', 404);
      return matchDto(row);
    },
  );

  app.delete(
    '/api/v1/matches/:id',
    { preHandler: authenticate, schema: { params: IdParamsSchema } },
    async (request, reply) => {
      if (!(await store.deleteDraftMatch(auth(request).sub, request.params.id)))
        throw new DomainError(DomainErrorCodes.conflict, '只有草稿比赛可以删除', 409);
      return reply.status(204).send();
    },
  );

  app.get('/api/v1/prompts', { preHandler: authenticate }, async (request) => ({
    data: (await store.listPrompts(auth(request).sub)).map(promptDto),
  }));
  app.post(
    '/api/v1/prompts',
    { preHandler: authenticate, schema: { body: CreatePromptBodySchema } },
    async (request, reply) => {
      const row = await store.createPrompt(auth(request).sub, {
        name: request.body.name.trim(),
        description: request.body.description?.trim(),
        content: request.body.content.trim(),
        isDefault: request.body.isDefault ?? false,
      });
      return reply.status(201).send(promptDto(row));
    },
  );
  app.get(
    '/api/v1/prompts/:id',
    { preHandler: authenticate, schema: { params: IdParamsSchema } },
    async (request) => {
      const row = await store.findPrompt(auth(request).sub, request.params.id);
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '分析模板不存在', 404);
      return promptDto(row);
    },
  );
  app.post(
    '/api/v1/prompts/:id/versions',
    {
      preHandler: authenticate,
      schema: { params: IdParamsSchema, body: CreatePromptVersionBodySchema },
    },
    async (request) => {
      const row = await store.createPromptVersion(
        auth(request).sub,
        request.params.id,
        request.body.content.trim(),
      );
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '分析模板不存在', 404);
      return promptDto(row);
    },
  );
  app.post(
    '/api/v1/prompts/:id/set-default',
    { preHandler: authenticate, schema: { params: IdParamsSchema } },
    async (request) => {
      const row = await store.setDefaultPrompt(auth(request).sub, request.params.id);
      if (!row) throw new DomainError(DomainErrorCodes.notFound, '分析模板不存在', 404);
      return promptDto(row);
    },
  );

  app.get(
    '/api/v1/settings',
    { preHandler: authenticate },
    async (request): Promise<UserSettingsDto> => {
      const settings =
        (await store.getSettings(auth(request).sub)) ??
        (await store.updateSettings(auth(request).sub, {}));
      return { ...settings, pushNotificationsAvailable: false, externalServicesConfigured: false };
    },
  );
  app.patch(
    '/api/v1/settings',
    { preHandler: authenticate, schema: { body: UpdateSettingsBodySchema } },
    async (request): Promise<UserSettingsDto> => {
      const input = {
        ...request.body,
        ...(request.body.recipientEmail
          ? { recipientEmail: normalizeEmail(request.body.recipientEmail) }
          : {}),
        ...(request.body.defaultTimezone
          ? { defaultTimezone: validateIanaTimezone(request.body.defaultTimezone) }
          : {}),
      };
      const settings = await store.updateSettings(auth(request).sub, input);
      return { ...settings, pushNotificationsAvailable: false, externalServicesConfigured: false };
    },
  );

  app.addHook('onClose', async () => store.close());
  return app;
}
