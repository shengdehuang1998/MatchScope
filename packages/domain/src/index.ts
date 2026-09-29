export const DomainErrorCodes = {
  unauthorized: 'UNAUTHORIZED',
  invalidCredentials: 'INVALID_CREDENTIALS',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  validation: 'VALIDATION_ERROR',
  matchAlreadyStarted: 'MATCH_ALREADY_STARTED',
  matchNotEditable: 'MATCH_NOT_EDITABLE',
  sameTeams: 'SAME_HOME_AND_AWAY_TEAM',
  kickoffInPast: 'KICKOFF_IN_PAST',
  promptVersionNotFound: 'PROMPT_VERSION_NOT_FOUND',
  conflict: 'CONFLICT',
} as const;

export type DomainErrorCode = (typeof DomainErrorCodes)[keyof typeof DomainErrorCodes];

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(DomainErrorCodes.validation, `${fieldName}不能为空`);
  }
  return normalized;
}

export function validateTeams(homeTeam: string, awayTeam: string): void {
  const home = requireNonBlank(homeTeam, '主队');
  const away = requireNonBlank(awayTeam, '客队');
  if (home.localeCompare(away, undefined, { sensitivity: 'accent' }) === 0) {
    throw new DomainError(DomainErrorCodes.sameTeams, '主队和客队不能相同');
  }
}

export function parseFutureKickoff(value: string, now = new Date()): Date {
  const kickoff = new Date(value);
  if (Number.isNaN(kickoff.getTime())) {
    throw new DomainError(DomainErrorCodes.validation, '开赛时间格式不正确');
  }
  if (kickoff.getTime() <= now.getTime()) {
    throw new DomainError(DomainErrorCodes.kickoffInPast, '开赛时间必须晚于当前时间');
  }
  return kickoff;
}

export function validateIanaTimezone(value: string): string {
  const timezone = requireNonBlank(value, '时区');
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: timezone }).format();
  } catch {
    throw new DomainError(DomainErrorCodes.validation, '时区必须是有效的 IANA 时区');
  }
  return timezone;
}

export type MatchStatus = 'draft' | 'scheduled' | 'cancelled' | 'finished';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  isActive: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface MatchRecord {
  id: string;
  userId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  inputTimezone: string;
  supplementalMaterial: string | null;
  promptVersionId: string;
  status: MatchStatus;
  scheduleVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersionRecord {
  id: string;
  userId: string;
  templateId: string;
  versionNumber: number;
  content: string;
  createdAt: Date;
}

export interface PromptTemplateRecord {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: PromptVersionRecord | null;
  versions?: PromptVersionRecord[];
}

export interface UserSettingsRecord {
  userId: string;
  recipientEmail: string;
  defaultTimezone: string;
  defaultAnalysisLeadMinutes: number;
  emailNotificationsEnabled: boolean;
}

export interface MatchFilters {
  status?: MatchStatus;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export interface CreateMatchInput {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  inputTimezone: string;
  supplementalMaterial?: string;
  promptVersionId: string;
  status: 'draft' | 'scheduled';
}

export interface UpdateMatchInput {
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  kickoffAt?: Date;
  inputTimezone?: string;
  supplementalMaterial?: string | null;
  promptVersionId?: string;
  status?: 'draft' | 'scheduled';
}

export interface AppStore {
  ready(): Promise<boolean>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SessionRecord>;
  findSessionById(id: string): Promise<SessionRecord | null>;
  findSessionByTokenHash(hash: string): Promise<SessionRecord | null>;
  rotateSession(
    sessionId: string,
    input: {
      refreshTokenHash: string;
      expiresAt: Date;
      deviceName?: string;
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<SessionRecord>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
  listMatches(userId: string, filters: MatchFilters): Promise<MatchRecord[]>;
  findMatch(userId: string, id: string): Promise<MatchRecord | null>;
  createMatch(userId: string, input: CreateMatchInput): Promise<MatchRecord>;
  updateMatch(userId: string, id: string, input: UpdateMatchInput): Promise<MatchRecord | null>;
  cancelMatch(userId: string, id: string): Promise<MatchRecord | null>;
  deleteDraftMatch(userId: string, id: string): Promise<boolean>;
  promptVersionBelongsToUser(userId: string, versionId: string): Promise<boolean>;
  listPrompts(userId: string): Promise<PromptTemplateRecord[]>;
  findPrompt(userId: string, id: string): Promise<PromptTemplateRecord | null>;
  createPrompt(
    userId: string,
    input: {
      name: string;
      description?: string;
      content: string;
      isDefault: boolean;
    },
  ): Promise<PromptTemplateRecord>;
  createPromptVersion(
    userId: string,
    templateId: string,
    content: string,
  ): Promise<PromptTemplateRecord | null>;
  setDefaultPrompt(userId: string, templateId: string): Promise<PromptTemplateRecord | null>;
  getSettings(userId: string): Promise<UserSettingsRecord | null>;
  updateSettings(
    userId: string,
    input: Partial<Omit<UserSettingsRecord, 'userId'>>,
  ): Promise<UserSettingsRecord>;
  close(): Promise<void>;
}
