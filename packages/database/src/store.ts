import type {
  AppStore,
  CreateMatchInput,
  MatchFilters,
  MatchRecord,
  PromptTemplateRecord,
  SessionRecord,
  UpdateMatchInput,
  UserRecord,
  UserSettingsRecord,
} from '@match-insight/domain';
import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  matches,
  promptTemplates,
  promptVersions,
  sessions,
  userSettings,
  users,
} from './schema.js';

type Database = ReturnType<typeof drizzle>;

export class PostgresStore implements AppStore {
  private readonly pool: Pool;
  private readonly db: Database;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
    this.db = drizzle(this.pool);
  }

  async ready(): Promise<boolean> {
    await this.pool.query('SELECT 1');
    return true;
  }

  async createUser(input: { email: string; passwordHash: string }): Promise<UserRecord | null> {
    const [row] = await this.db.insert(users).values(input).onConflictDoNothing().returning();
    return row ?? null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);
    return row ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SessionRecord> {
    const [row] = await this.db.insert(sessions).values(input).returning();
    return row;
  }

  async findSessionByTokenHash(hash: string): Promise<SessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, hash))
      .limit(1);
    return row ?? null;
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return row ?? null;
  }

  async rotateSession(
    sessionId: string,
    input: {
      refreshTokenHash: string;
      expiresAt: Date;
      deviceName?: string;
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<SessionRecord> {
    return this.db.transaction(async (tx) => {
      const [oldSession] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .for('update')
        .limit(1);
      if (!oldSession || oldSession.revokedAt) throw new Error('SESSION_NOT_ACTIVE');
      const [replacement] = await tx
        .insert(sessions)
        .values({ ...input, userId: oldSession.userId })
        .returning();
      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), replacedBySessionId: replacement.id, lastUsedAt: new Date() })
        .where(eq(sessions.id, sessionId));
      return replacement;
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  }

  async listMatches(userId: string, filters: MatchFilters): Promise<MatchRecord[]> {
    const predicates = [eq(matches.userId, userId), isNull(matches.deletedAt)];
    if (filters.status) predicates.push(eq(matches.status, filters.status));
    if (filters.from) predicates.push(gte(matches.kickoffAt, filters.from));
    if (filters.to) predicates.push(lte(matches.kickoffAt, filters.to));
    const rows = await this.db
      .select()
      .from(matches)
      .where(and(...predicates))
      .orderBy(asc(matches.kickoffAt))
      .limit(filters.limit)
      .offset(filters.offset);
    return rows as MatchRecord[];
  }

  async findMatch(userId: string, id: string): Promise<MatchRecord | null> {
    const [row] = await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.id, id), eq(matches.userId, userId), isNull(matches.deletedAt)))
      .limit(1);
    return (row as MatchRecord | undefined) ?? null;
  }

  async createMatch(userId: string, input: CreateMatchInput): Promise<MatchRecord> {
    const [row] = await this.db
      .insert(matches)
      .values({ ...input, userId, supplementalMaterial: input.supplementalMaterial ?? null })
      .returning();
    return row as MatchRecord;
  }

  async updateMatch(
    userId: string,
    id: string,
    input: UpdateMatchInput,
  ): Promise<MatchRecord | null> {
    const set = {
      ...input,
      ...(input.kickoffAt ? { scheduleVersion: sql`${matches.scheduleVersion} + 1` } : {}),
      updatedAt: new Date(),
    };
    const [row] = await this.db
      .update(matches)
      .set(set)
      .where(and(eq(matches.id, id), eq(matches.userId, userId), isNull(matches.deletedAt)))
      .returning();
    return (row as MatchRecord | undefined) ?? null;
  }

  async cancelMatch(userId: string, id: string): Promise<MatchRecord | null> {
    const [row] = await this.db
      .update(matches)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(matches.id, id), eq(matches.userId, userId), isNull(matches.deletedAt)))
      .returning();
    return (row as MatchRecord | undefined) ?? null;
  }

  async deleteDraftMatch(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(matches)
      .where(and(eq(matches.id, id), eq(matches.userId, userId), eq(matches.status, 'draft')))
      .returning({ id: matches.id });
    return rows.length > 0;
  }

  async promptVersionBelongsToUser(userId: string, versionId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: promptVersions.id })
      .from(promptVersions)
      .where(and(eq(promptVersions.id, versionId), eq(promptVersions.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  private async hydratePrompt(
    row: typeof promptTemplates.$inferSelect,
    includeVersions = false,
  ): Promise<PromptTemplateRecord> {
    const versions = await this.db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.templateId, row.id))
      .orderBy(desc(promptVersions.versionNumber));
    const currentVersion = versions.find((version) => version.id === row.currentVersionId) ?? null;
    return { ...row, currentVersion, ...(includeVersions ? { versions } : {}) };
  }

  async listPrompts(userId: string): Promise<PromptTemplateRecord[]> {
    const rows = await this.db
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.userId, userId), isNull(promptTemplates.archivedAt)))
      .orderBy(desc(promptTemplates.isDefault), desc(promptTemplates.updatedAt));
    return Promise.all(rows.map((row) => this.hydratePrompt(row)));
  }

  async findPrompt(userId: string, id: string): Promise<PromptTemplateRecord | null> {
    const [row] = await this.db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.id, id),
          eq(promptTemplates.userId, userId),
          isNull(promptTemplates.archivedAt),
        ),
      )
      .limit(1);
    return row ? this.hydratePrompt(row, true) : null;
  }

  async createPrompt(
    userId: string,
    input: { name: string; description?: string; content: string; isDefault: boolean },
  ): Promise<PromptTemplateRecord> {
    const templateId = await this.db.transaction(async (tx) => {
      if (input.isDefault)
        await tx
          .update(promptTemplates)
          .set({ isDefault: false })
          .where(eq(promptTemplates.userId, userId));
      const [template] = await tx
        .insert(promptTemplates)
        .values({
          userId,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault,
        })
        .returning();
      const [version] = await tx
        .insert(promptVersions)
        .values({
          userId,
          templateId: template.id,
          versionNumber: 1,
          content: input.content,
          createdByUserId: userId,
        })
        .returning();
      await tx
        .update(promptTemplates)
        .set({ currentVersionId: version.id, updatedAt: new Date() })
        .where(eq(promptTemplates.id, template.id));
      return template.id;
    });
    const result = await this.findPrompt(userId, templateId);
    if (!result) throw new Error('PROMPT_CREATE_FAILED');
    return result;
  }

  async createPromptVersion(
    userId: string,
    templateId: string,
    content: string,
  ): Promise<PromptTemplateRecord | null> {
    const found = await this.findPrompt(userId, templateId);
    if (!found) return null;
    await this.db.transaction(async (tx) => {
      await tx
        .select({ id: promptTemplates.id })
        .from(promptTemplates)
        .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, userId)))
        .for('update');
      const [{ nextVersion }] = await tx
        .select({ nextVersion: sql<number>`coalesce(max(${promptVersions.versionNumber}), 0) + 1` })
        .from(promptVersions)
        .where(eq(promptVersions.templateId, templateId));
      const [version] = await tx
        .insert(promptVersions)
        .values({
          userId,
          templateId,
          versionNumber: Number(nextVersion),
          content,
          createdByUserId: userId,
        })
        .returning();
      await tx
        .update(promptTemplates)
        .set({ currentVersionId: version.id, updatedAt: new Date() })
        .where(eq(promptTemplates.id, templateId));
    });
    return this.findPrompt(userId, templateId);
  }

  async setDefaultPrompt(userId: string, templateId: string): Promise<PromptTemplateRecord | null> {
    const found = await this.findPrompt(userId, templateId);
    if (!found) return null;
    await this.db.transaction(async (tx) => {
      await tx
        .update(promptTemplates)
        .set({ isDefault: false })
        .where(eq(promptTemplates.userId, userId));
      await tx
        .update(promptTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, userId)));
    });
    return this.findPrompt(userId, templateId);
  }

  async getSettings(userId: string): Promise<UserSettingsRecord | null> {
    const [row] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async updateSettings(
    userId: string,
    input: Partial<Omit<UserSettingsRecord, 'userId'>>,
  ): Promise<UserSettingsRecord> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    const [row] = await this.db
      .insert(userSettings)
      .values({ userId, recipientEmail: input.recipientEmail ?? user.email, ...input })
      .onConflictDoUpdate({ target: userSettings.userId, set: { ...input, updatedAt: new Date() } })
      .returning();
    return row;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
