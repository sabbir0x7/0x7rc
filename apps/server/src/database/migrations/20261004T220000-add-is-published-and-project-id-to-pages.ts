import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
  `.execute(db);

  await sql`
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE pages DROP COLUMN IF EXISTS is_published;
    ALTER TABLE pages DROP COLUMN IF EXISTS project_id;
  `.execute(db);
}
