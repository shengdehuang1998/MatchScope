import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const migrationDirectory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url));
const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS _matchscope_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamp with time zone NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of files) {
    const sql = await readFile(resolve(migrationDirectory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = await pool.query<{ checksum: string }>(
      'SELECT checksum FROM _matchscope_migrations WHERE name = $1',
      [name],
    );
    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await pool.query(sql);
    await pool.query('INSERT INTO _matchscope_migrations(name, checksum) VALUES ($1, $2)', [
      name,
      checksum,
    ]);
    console.log(`Applied ${name}`);
  }
} finally {
  await pool.end();
}
