import pg from 'pg';
import { Redis } from 'ioredis';
import { sql, type Kysely } from 'kysely';
import { createDb, createPool } from '../db/kysely.js';
import type { Database } from '../db/types.js';

const ADMIN_URL = 'postgres://postgres:postgres@localhost:5432/postgres';
export const TEST_DB_URL =
  'postgres://postgres:postgres@localhost:5432/concentrate_test';
export const TEST_REDIS_URL = 'redis://localhost:6379/1';

export async function ensureTestDb(): Promise<void> {
  const admin = new pg.Pool({ connectionString: ADMIN_URL });
  const { rows } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = 'concentrate_test'"
  );
  if (rows.length === 0) await admin.query('CREATE DATABASE concentrate_test');
  await admin.end();
}

export function makeTestDb(): Kysely<Database> {
  return createDb(createPool(TEST_DB_URL));
}

export function makeTestRedis(): Redis {
  return new Redis(TEST_REDIS_URL);
}

const TABLES = [
  'grades',
  'submissions',
  'assignments',
  'enrollments',
  'classes',
  'teacher_group_members',
  'teacher_groups',
  'users',
];

export async function resetDb(db: Kysely<Database>): Promise<void> {
  await sql.raw(`TRUNCATE ${TABLES.join(', ')} CASCADE`).execute(db);
}
