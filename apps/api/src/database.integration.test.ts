import { expect, it } from 'vitest';
import { PostgresStore } from '@match-insight/database';
import { buildApp } from './app.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('真实数据库业务闭环', async () => {
  const app = await buildApp(new PostgresStore(process.env.TEST_DATABASE_URL!), {
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: process.env.TEST_DATABASE_URL!,
    jwtAccessSecret: 'integration-test-secret-at-least-32-characters',
    accessTokenTtlMinutes: 15,
    refreshTokenTtlDays: 30,
    corsOrigins: [],
  });
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'temporary-test-password-123' },
    });
    expect(login.statusCode).toBe(200);
    const headers = { authorization: `Bearer ${login.json().tokens.accessToken}` };
    const prompts = await app.inject({ method: 'GET', url: '/api/v1/prompts', headers });
    expect(prompts.statusCode).toBe(200);
    const template = prompts.json().data[0];
    const version = await app.inject({
      method: 'POST',
      url: `/api/v1/prompts/${template.id}/versions`,
      headers,
      payload: { content: '新的分析要求' },
    });
    expect(version.statusCode).toBe(200);
    expect(
      version.json().versions.some((v: { id: string }) => v.id === template.currentVersion.id),
    ).toBe(true);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers,
      payload: {
        league: '测试联赛',
        homeTeam: '主队',
        awayTeam: '客队',
        kickoffAt: new Date(Date.now() + 3600000).toISOString(),
        inputTimezone: 'Asia/Shanghai',
        promptVersionId: template.currentVersion.id,
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const edited = await app.inject({
      method: 'PATCH',
      url: `/api/v1/matches/${id}`,
      headers,
      payload: { kickoffAt: new Date(Date.now() + 7200000).toISOString() },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().scheduleVersion).toBe(2);
    const cancelled = await app.inject({
      method: 'POST',
      url: `/api/v1/matches/${id}/cancel`,
      headers,
    });
    expect(cancelled.json().status).toBe('cancelled');
    const settings = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings',
      headers,
      payload: { defaultAnalysisLeadMinutes: 90 },
    });
    expect(settings.json().defaultAnalysisLeadMinutes).toBe(90);
    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers });
    expect(logout.statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/api/v1/matches', headers })).statusCode).toBe(
      401,
    );
  } finally {
    await app.close();
  }
});
