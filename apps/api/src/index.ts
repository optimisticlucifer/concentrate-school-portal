import { config } from './config.js';
import { db } from './db/kysely.js';
import { migrateToLatest } from './db/migrate.js';
import { seed } from './db/seed.js';
import { buildServer } from './server.js';

// Opt-in demo seeding: only runs when SEED_ON_EMPTY=true and the users table is
// empty, so it populates a fresh deployment once without ever wiping real data.
async function seedIfEmpty(): Promise<void> {
  if (process.env.SEED_ON_EMPTY !== 'true') return;
  const existing = await db.selectFrom('users').select('id').limit(1).execute();
  if (existing.length === 0) await seed(db);
}

async function main(): Promise<void> {
  await migrateToLatest(db);
  await seedIfEmpty();
  const app = await buildServer();
  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
