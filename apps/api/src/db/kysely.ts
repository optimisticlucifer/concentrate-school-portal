import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { config } from '../config.js';
import type { Database } from './types.js';

export function createPool(connectionString = config.databaseUrl): pg.Pool {
  return new pg.Pool({ connectionString });
}

export function createDb(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

export const pool = createPool();
export const db = createDb(pool);
