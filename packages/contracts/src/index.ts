import { type Static, Type } from '@sinclair/typebox';

export const MatchStatuses = ['draft', 'scheduled', 'cancelled', 'finished'] as const;
export type MatchStatus = (typeof MatchStatuses)[number];

export const ErrorResponseSchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
  requestId: Type.String(),
});

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 320 }),
  password: Type.String({ minLength: 8, maxLength: 256 }),
  deviceName: Type.Optional(Type.String({ maxLength: 200 })),
});
export type LoginBody = Static<typeof LoginBodySchema>;

export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String({ minLength: 32 }),
});
export type RefreshBody = Static<typeof RefreshBodySchema>;

export const AuthTokensSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresInSeconds: Type.Integer({ minimum: 1 }),
});
export type AuthTokens = Static<typeof AuthTokensSchema>;

export const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  displayName: Type.Union([Type.String(), Type.Null()]),
});
export type UserDto = Static<typeof UserSchema>;

export const MatchSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  league: Type.String(),
  homeTeam: Type.String(),
  awayTeam: Type.String(),
  kickoffAt: Type.String({ format: 'date-time' }),
  inputTimezone: Type.String(),
  supplementalMaterial: Type.Union([Type.String(), Type.Null()]),
  promptVersionId: Type.String({ format: 'uuid' }),
  status: Type.Union(MatchStatuses.map((status) => Type.Literal(status))),
  scheduleVersion: Type.Integer({ minimum: 1 }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
export type MatchDto = Static<typeof MatchSchema>;

export const CreateMatchBodySchema = Type.Object({
  league: Type.String({ minLength: 1, maxLength: 200 }),
  homeTeam: Type.String({ minLength: 1, maxLength: 200 }),
  awayTeam: Type.String({ minLength: 1, maxLength: 200 }),
  kickoffAt: Type.String({ format: 'date-time' }),
  inputTimezone: Type.String({ minLength: 1, maxLength: 100 }),
  supplementalMaterial: Type.Optional(Type.String({ maxLength: 50000 })),
  promptVersionId: Type.String({ format: 'uuid' }),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('scheduled')])),
});
export type CreateMatchBody = Static<typeof CreateMatchBodySchema>;

export const UpdateMatchBodySchema = Type.Partial(
  Type.Object({
    league: Type.String({ minLength: 1, maxLength: 200 }),
    homeTeam: Type.String({ minLength: 1, maxLength: 200 }),
    awayTeam: Type.String({ minLength: 1, maxLength: 200 }),
    kickoffAt: Type.String({ format: 'date-time' }),
    inputTimezone: Type.String({ minLength: 1, maxLength: 100 }),
    supplementalMaterial: Type.Union([Type.String({ maxLength: 50000 }), Type.Null()]),
    promptVersionId: Type.String({ format: 'uuid' }),
    status: Type.Union([Type.Literal('draft'), Type.Literal('scheduled')]),
  }),
  { minProperties: 1 },
);
export type UpdateMatchBody = Static<typeof UpdateMatchBodySchema>;

export const MatchListQuerySchema = Type.Object({
  status: Type.Optional(Type.Union(MatchStatuses.map((status) => Type.Literal(status)))),
  from: Type.Optional(Type.String({ format: 'date-time' })),
  to: Type.Optional(Type.String({ format: 'date-time' })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});
export type MatchListQuery = Static<typeof MatchListQuerySchema>;

export const PromptVersionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  versionNumber: Type.Integer({ minimum: 1 }),
  content: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});
export type PromptVersionDto = Static<typeof PromptVersionSchema>;

export const PromptTemplateSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isDefault: Type.Boolean(),
  currentVersion: Type.Union([PromptVersionSchema, Type.Null()]),
  versions: Type.Optional(Type.Array(PromptVersionSchema)),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
export type PromptTemplateDto = Static<typeof PromptTemplateSchema>;

export const CreatePromptBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  content: Type.String({ minLength: 1, maxLength: 50000 }),
  isDefault: Type.Optional(Type.Boolean()),
});
export type CreatePromptBody = Static<typeof CreatePromptBodySchema>;

export const CreatePromptVersionBodySchema = Type.Object({
  content: Type.String({ minLength: 1, maxLength: 50000 }),
});
export type CreatePromptVersionBody = Static<typeof CreatePromptVersionBodySchema>;

export const UserSettingsSchema = Type.Object({
  recipientEmail: Type.String({ format: 'email' }),
  defaultTimezone: Type.String(),
  defaultAnalysisLeadMinutes: Type.Integer({ minimum: 0, maximum: 10080 }),
  emailNotificationsEnabled: Type.Boolean(),
  pushNotificationsAvailable: Type.Literal(false),
  externalServicesConfigured: Type.Literal(false),
});
export type UserSettingsDto = Static<typeof UserSettingsSchema>;

export const UpdateSettingsBodySchema = Type.Partial(
  Type.Object({
    recipientEmail: Type.String({ format: 'email' }),
    defaultTimezone: Type.String({ minLength: 1, maxLength: 100 }),
    defaultAnalysisLeadMinutes: Type.Integer({ minimum: 0, maximum: 10080 }),
    emailNotificationsEnabled: Type.Boolean(),
  }),
  { minProperties: 1 },
);
export type UpdateSettingsBody = Static<typeof UpdateSettingsBodySchema>;
