import { hash } from 'argon2';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { promptTemplates, promptVersions, userSettings, users } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.INIT_USER_EMAIL?.trim().toLowerCase();
const password = process.env.INIT_USER_PASSWORD;
const displayName = process.env.INIT_USER_DISPLAY_NAME?.trim() || 'MatchScope User';
const templateName = process.env.INIT_PROMPT_NAME?.trim() || '默认赛前分析模板';
const templateContent =
  process.env.INIT_PROMPT_CONTENT?.trim() ||
  '请根据提供的比赛资料，客观分析双方近期状态、关键影响因素和主要风险。不要编造未提供的事实。';

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (!email) throw new Error('INIT_USER_EMAIL is required');
if (!password || password.length < 12)
  throw new Error('INIT_USER_PASSWORD must contain at least 12 characters');

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

try {
  await db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await tx
        .insert(users)
        .values({ email, passwordHash: await hash(password), displayName })
        .returning();
    }
    await tx
      .insert(userSettings)
      .values({ userId: user.id, recipientEmail: email })
      .onConflictDoNothing();
    const [existingTemplate] = await tx
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.userId, user.id), eq(promptTemplates.isDefault, true)))
      .limit(1);
    if (!existingTemplate) {
      const [template] = await tx
        .insert(promptTemplates)
        .values({
          userId: user.id,
          name: templateName,
          description: '系统初始化的默认分析模板',
          isDefault: true,
        })
        .returning();
      const [version] = await tx
        .insert(promptVersions)
        .values({
          userId: user.id,
          templateId: template.id,
          versionNumber: 1,
          content: templateContent,
          createdByUserId: user.id,
        })
        .returning();
      await tx
        .update(promptTemplates)
        .set({ currentVersionId: version.id })
        .where(eq(promptTemplates.id, template.id));
    }
  });
  console.log(`Seed completed for ${email}`);
} finally {
  await pool.end();
}
