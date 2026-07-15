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

describe('auth routes', () => {
  it('logs in with valid credentials', async () => {
    await seedUser(db, { role: 'admin', email: 'a@test.local' });
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'a@test.local', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.headers['set-cookie'].join()).toContain('access_token');
  });

  it('rejects a wrong password', async () => {
    await seedUser(db, { role: 'student', email: 's@test.local' });
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 's@test.local', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('rejects a suspended account', async () => {
    await seedUser(db, {
      role: 'student',
      email: 'susp@test.local',
      suspended: true,
    });
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'susp@test.local', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('validates the login body', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns the current user from /me', async () => {
    await seedUser(db, { role: 'teacher', email: 't@test.local' });
    const agent = await login(app, 't@test.local');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('t@test.local');
  });

  it('rejects /me without a token', async () => {
    const res = await request(app.server).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs out and invalidates the session', async () => {
    await seedUser(db, { role: 'student', email: 'lo@test.local' });
    const agent = await login(app, 'lo@test.local');
    await agent.post('/api/auth/logout').expect(200);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('refreshes an access token', async () => {
    await seedUser(db, { role: 'student', email: 'rf@test.local' });
    const agent = await login(app, 'rf@test.local');
    const res = await agent.post('/api/auth/refresh');
    expect(res.status).toBe(200);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await request(app.server).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});
