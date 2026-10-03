export interface ApiConfig {
  host: string;
  port: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
  corsOrigins: string[];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadConfig(): ApiConfig {
  const jwtAccessSecret = required('JWT_ACCESS_SECRET');
  if (jwtAccessSecret.length < 32)
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  return {
    host: process.env.HOST?.trim() || '0.0.0.0',
    port: positiveInteger('PORT', 8187),
    databaseUrl: required('DATABASE_URL'),
    jwtAccessSecret,
    accessTokenTtlMinutes: positiveInteger('ACCESS_TOKEN_TTL_MINUTES', 15),
    refreshTokenTtlDays: positiveInteger('REFRESH_TOKEN_TTL_DAYS', 30),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:8183')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };
}
