import type { AppStore } from '@match-insight/domain';
import { hash } from 'argon2';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { ApiConfig } from './config.js';

const config: ApiConfig = {
  host: '127.0.0.1',
  port: 3000,
  databaseUrl: 'unused',
  jwtAccessSecret: 'test-secret-that-is-at-least-32-characters',
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 30,
  corsOrigins: ['http://localhost:5173'],
};

function makeStore(overrides: Partial<AppStore> = {}): AppStore {
  const unused = async () => {
    throw new Error('UNEXPECTED_STORE_CALL');
  };
  return {
    ready: async () => true,
    findUserByEmail: async () => null,
    findUserById: async () => null,
    createSession: unused,
    findSessionById: async () => null,
    findSessionByTokenHash: async () => null,
    rotateSession: unused,
    revokeSession: async () => undefined,
    listMatches: async () => [],
    findMatch: async () => null,
    createMatch: unused,
    updateMatch: async () => null,
    cancelMatch: async () => null,
    deleteDraftMatch: async () => false,
    promptVersionBelongsToUser: async () => false,
    listPrompts: async () => [],
    findPrompt: async () => null,
    createPrompt: unused,
    createPromptVersion: async () => null,
    setDefaultPrompt: async () => null,
    getSettings: async () => null,
    updateSettings: unused,
    close: async () => undefined,
    ...overrides,
  };
}

describe('API', () => {
  const userId = '9fbe7942-9a3a-4e1e-9d14-dd0138beaa11';
  const sessionId = '2bf771db-94cc-4ffc-912b-8d6b297c6162';
  const promptVersionId = 'e1455dcf-bdd4-4cc0-a5d8-069f8c988870';
  const activeSession = {
    id: sessionId,
    userId,
    refreshTokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };

  it('返回存活状态', async () => {
    const app = await buildApp(makeStore(), config);
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('拒绝未登录访问业务接口', async () => {
    const app = await buildApp(makeStore(), config);
    const response = await app.inject({ method: 'GET', url: '/api/v1/matches' });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('登录失败使用统一错误', async () => {
    const app = await buildApp(makeStore(), config);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'missing@example.com', password: 'password123' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('INVALID_CREDENTIALS');
    await app.close();
  });

  it('登录成功返回访问令牌和轮换用刷新令牌', async () => {
    const passwordHash = await hash('strong-password');
    const app = await buildApp(
      makeStore({
        findUserByEmail: async () => ({
          id: '9fbe7942-9a3a-4e1e-9d14-dd0138beaa11',
          email: 'owner@example.com',
          passwordHash,
          displayName: 'Owner',
          isActive: true,
        }),
        createSession: async (input) => ({
          id: '2bf771db-94cc-4ffc-912b-8d6b297c6162',
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          revokedAt: null,
        }),
      }),
      config,
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'owner@example.com', password: 'strong-password' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().tokens.accessToken).toBeTypeOf('string');
    expect(response.json().tokens.refreshToken).toBeTypeOf('string');
    await app.close();
  });

  it('拒绝相同主客队', async () => {
    const app = await buildApp(makeStore({ findSessionById: async () => activeSession }), config);
    const accessToken = app.jwt.sign({ sessionId }, { sub: userId });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        league: '英超',
        homeTeam: '阿森纳',
        awayTeam: '阿森纳',
        kickoffAt: new Date(Date.now() + 60_000).toISOString(),
        inputTimezone: 'Asia/Shanghai',
        promptVersionId,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('SAME_HOME_AND_AWAY_TEAM');
    await app.close();
  });

  it('拒绝过去的开赛时间', async () => {
    const app = await buildApp(makeStore({ findSessionById: async () => activeSession }), config);
    const accessToken = app.jwt.sign({ sessionId }, { sub: userId });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        league: '英超',
        homeTeam: '阿森纳',
        awayTeam: '切尔西',
        kickoffAt: '2025-01-01T00:00:00.000Z',
        inputTimezone: 'Asia/Shanghai',
        promptVersionId,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('KICKOFF_IN_PAST');
    await app.close();
  });

  it('修改开赛时间时返回增加后的排期版本', async () => {
    const current = {
      id: '326fc1eb-a47e-494e-8c9f-f1371832658d',
      userId,
      league: '英超',
      homeTeam: '阿森纳',
      awayTeam: '切尔西',
      kickoffAt: new Date(Date.now() + 3_600_000),
      inputTimezone: 'Asia/Shanghai',
      supplementalMaterial: null,
      promptVersionId,
      status: 'scheduled' as const,
      scheduleVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const app = await buildApp(
      makeStore({
        findSessionById: async () => activeSession,
        findMatch: async () => current,
        updateMatch: async (_ownerId, _matchId, input) => ({
          ...current,
          kickoffAt: input.kickoffAt ?? current.kickoffAt,
          scheduleVersion: input.kickoffAt ? 2 : 1,
        }),
      }),
      config,
    );
    const accessToken = app.jwt.sign({ sessionId }, { sub: userId });
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/matches/${current.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { kickoffAt: new Date(Date.now() + 7_200_000).toISOString() },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().scheduleVersion).toBe(2);
    await app.close();
  });
});
