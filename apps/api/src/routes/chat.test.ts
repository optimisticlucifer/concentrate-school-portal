import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { makeTestDb, makeTestRedis, resetDb } from '../test/db.js';
import { login, seedUser } from '../test/factory.js';

const db = makeTestDb();
const redis = makeTestRedis();
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer({ db, redis });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await db.destroy();
  await redis.quit();
});
beforeEach(async () => {
  await resetDb(db);
  await redis.flushdb();
});

describe('chat route', () => {
  it('requires authentication', async () => {
    const res = await request(app.server)
      .post('/api/chat')
      .send({ message: 'hi' });
    expect(res.status).toBe(401);
  });

  it('answers an authenticated user', async () => {
    await seedUser(db, { role: 'student', email: 'chat@test.local' });
    const agent = await login(app, 'chat@test.local');
    const res = await agent.post('/api/chat').send({ message: 'what is due?' });
    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
  });

  it('validates the message body', async () => {
    await seedUser(db, { role: 'student', email: 'chat2@test.local' });
    const agent = await login(app, 'chat2@test.local');
    const res = await agent.post('/api/chat').send({});
    expect(res.status).toBe(400);
  });
});
