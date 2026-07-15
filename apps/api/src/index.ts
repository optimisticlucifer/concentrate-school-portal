import { config } from './config.js';
import { db } from './db/kysely.js';
import { migrateToLatest } from './db/migrate.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  await migrateToLatest(db);
  const app = await buildServer();
  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
