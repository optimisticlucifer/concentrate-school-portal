import { beforeAll } from 'vitest';
import { migrateToLatest } from '../db/migrate.js';
import { ensureTestDb, makeTestDb } from './db.js';

beforeAll(async () => {
  await ensureTestDb();
  const db = makeTestDb();
  await migrateToLatest(db);
  await db.destroy();
});
