import {
  bigint,
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_email_lower_unique_idx').on(sql`lower(${table.email})`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    deviceName: text('device_name'),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBySessionId: uuid('replaced_by_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_refresh_token_hash_unique_idx').on(table.refreshTokenHash),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const promptTemplates = pgTable(
  'prompt_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isDefault: boolean('is_default').notNull().default(false),
    currentVersionId: uuid('current_version_id'),
    ...timestamps,
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    unique('prompt_templates_user_id_id_unique').on(table.userId, table.id),
    index('prompt_templates_user_id_idx').on(table.userId, table.createdAt),
  ],
);

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => promptTemplates.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    content: text('content').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('prompt_versions_template_version_unique').on(table.templateId, table.versionNumber),
    unique('prompt_versions_user_id_id_unique').on(table.userId, table.id),
    index('prompt_versions_template_created_idx').on(table.templateId, table.versionNumber),
    check('prompt_versions_version_positive', sql`${table.versionNumber} > 0`),
  ],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    league: text('league').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
    inputTimezone: text('input_timezone').notNull().default('Asia/Shanghai'),
    supplementalMaterial: text('supplemental_material'),
    promptVersionId: uuid('prompt_version_id')
      .notNull()
      .references(() => promptVersions.id),
    status: text('status').notNull().default('draft'),
    scheduleVersion: integer('schedule_version').notNull().default(1),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('matches_user_kickoff_idx').on(table.userId, table.kickoffAt),
    index('matches_user_status_kickoff_idx').on(table.userId, table.status, table.kickoffAt),
    index('matches_prompt_version_id_idx').on(table.promptVersionId),
    check(
      'matches_status_valid',
      sql`${table.status} in ('draft', 'scheduled', 'cancelled', 'finished')`,
    ),
    check('matches_schedule_version_positive', sql`${table.scheduleVersion} > 0`),
  ],
);

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipientEmail: text('recipient_email').notNull(),
  defaultTimezone: text('default_timezone').notNull().default('Asia/Shanghai'),
  defaultAnalysisLeadMinutes: integer('default_analysis_lead_minutes').notNull().default(60),
  emailNotificationsEnabled: boolean('email_notifications_enabled').notNull().default(true),
  ...timestamps,
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    requestId: text('request_id'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_actor_created_idx').on(table.actorUserId, table.createdAt),
    index('audit_logs_resource_created_idx').on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
  ],
);
