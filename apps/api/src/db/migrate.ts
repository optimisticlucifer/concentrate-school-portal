import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileMigrationProvider, Migrator, type Kysely } from 'kysely';
import type { Database } from './types.js';
import { db as defaultDb, pool } from './kysely.js';

export function makeMigrator(db: Kysely<Database>): Migrator {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(dir, 'migrations'),
    }),
  });
}

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const { error, results } = await makeMigrator(db).migrateToLatest();
  for (const r of results ?? []) {
    if (r.status === 'Success')
      console.log(`migrated: ${r.migrationName}`);
    else if (r.status === 'Error')
      console.error(`failed: ${r.migrationName}`);
  }
  if (error) throw error;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  migrateToLatest(defaultDb)
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
