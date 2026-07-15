import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { makeTestDb, makeTestRedis, resetDb } from '../test/db.js';
import { login, seedUser } from '../test/factory.js';

const db = makeTestDb();
const redis = makeTestRedis();
let app: FastifyInstance;

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

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

async function adminAgent() {
  await seedUser(db, { role: 'admin', email: 'admin@test.local' });
  return login(app, 'admin@test.local');
}

describe('admin auth guards', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.server).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin roles with 403', async () => {
    await seedUser(db, { role: 'teacher', email: 't@test.local' });
    const agent = await login(app, 't@test.local');
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(403);
  });

  it('rejects student on admin group create with 403', async () => {
    await seedUser(db, { role: 'student', email: 's@test.local' });
    const agent = await login(app, 's@test.local');
    const res = await agent.post('/api/admin/groups').send({ name: 'X', teacherIds: [] });
    expect(res.status).toBe(403);
  });
});

describe('admin groups CRUD', () => {
  it('creates a group with teachers -> 201 and lists it', async () => {
    const agent = await adminAgent();
    const t1 = await seedUser(db, { role: 'teacher' });
    const t2 = await seedUser(db, { role: 'teacher' });

    const created = await agent
      .post('/api/admin/groups')
      .send({ name: 'Science', teacherIds: [t1.id, t2.id] });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Science');
    expect(created.body.teachers).toHaveLength(2);
    expect(created.body.teachers.map((t: { id: string }) => t.id).sort()).toEqual(
      [t1.id, t2.id].sort()
    );

    const list = await agent.get('/api/admin/groups');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it('rejects a non-teacher id in teacherIds with 400', async () => {
    const agent = await adminAgent();
    const student = await seedUser(db, { role: 'student' });
    const res = await agent
      .post('/api/admin/groups')
      .send({ name: 'Bad', teacherIds: [student.id] });
    expect(res.status).toBe(400);
  });

  it('updates a group name and membership', async () => {
    const agent = await adminAgent();
    const t1 = await seedUser(db, { role: 'teacher' });
    const t2 = await seedUser(db, { role: 'teacher' });
    const created = await agent
      .post('/api/admin/groups')
      .send({ name: 'Old', teacherIds: [t1.id] });

    const updated = await agent
      .put(`/api/admin/groups/${created.body.id}`)
      .send({ name: 'New', teacherIds: [t2.id] });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('New');
    expect(updated.body.teachers).toHaveLength(1);
    expect(updated.body.teachers[0].id).toBe(t2.id);
  });

  it('returns 404 when updating a missing group', async () => {
    const agent = await adminAgent();
    const res = await agent
      .put(`/api/admin/groups/${MISSING_ID}`)
      .send({ name: 'Nope', teacherIds: [] });
    expect(res.status).toBe(404);
  });

  it('deletes a group', async () => {
    const agent = await adminAgent();
    const created = await agent
      .post('/api/admin/groups')
      .send({ name: 'Temp', teacherIds: [] });
    const del = await agent.delete(`/api/admin/groups/${created.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
    const list = await agent.get('/api/admin/groups');
    expect(list.body).toHaveLength(0);
  });

  it('returns 404 when deleting a missing group', async () => {
    const agent = await adminAgent();
    const res = await agent.delete(`/api/admin/groups/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('admin users CRUD', () => {
  it('creates a user -> 201', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/admin/users').send({
      email: 'new@test.local',
      name: 'New Teacher',
      role: 'teacher',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@test.local');
    expect(res.body.role).toBe('teacher');
    expect(res.body.suspended).toBe(false);
  });

  it('rejects a duplicate email with 409', async () => {
    const agent = await adminAgent();
    await seedUser(db, { role: 'student', email: 'dup@test.local' });
    const res = await agent.post('/api/admin/users').send({
      email: 'dup@test.local',
      name: 'Dup',
      role: 'student',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects a short password with 400', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/admin/users').send({
      email: 'short@test.local',
      name: 'Short',
      role: 'student',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('lists users', async () => {
    const agent = await adminAgent();
    await seedUser(db, { role: 'student', name: 'Zoe' });
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(200);
    // admin + seeded student
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.every((u: { email: string }) => typeof u.email === 'string')).toBe(true);
  });

  it('updates a user name and role', async () => {
    const agent = await adminAgent();
    const student = await seedUser(db, { role: 'student', name: 'Before' });
    const res = await agent
      .put(`/api/admin/users/${student.id}`)
      .send({ name: 'After', role: 'teacher' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('After');
    expect(res.body.role).toBe('teacher');
  });

  it('returns 404 when updating a missing user', async () => {
    const agent = await adminAgent();
    const res = await agent
      .put(`/api/admin/users/${MISSING_ID}`)
      .send({ name: 'Ghost', role: 'student' });
    expect(res.status).toBe(404);
  });

  it('deletes a user', async () => {
    const agent = await adminAgent();
    const student = await seedUser(db, { role: 'student' });
    const del = await agent.delete(`/api/admin/users/${student.id}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
  });

  it('returns 404 when deleting a missing user', async () => {
    const agent = await adminAgent();
    const res = await agent.delete(`/api/admin/users/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('admin suspension', () => {
  it('suspends a student and blocks that login', async () => {
    const agent = await adminAgent();
    const student = await seedUser(db, { role: 'student', email: 'ban@test.local' });

    // login works before suspension
    await login(app, 'ban@test.local');

    const res = await agent
      .patch(`/api/admin/users/${student.id}/suspension`)
      .send({ suspended: true });
    expect(res.status).toBe(200);
    expect(res.body.suspended).toBe(true);

    const relogin = await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'ban@test.local', password: 'password123' });
    expect(relogin.status).toBe(401);
  });

  it('unsuspends a teacher back to active', async () => {
    const agent = await adminAgent();
    const teacher = await seedUser(db, {
      role: 'teacher',
      email: 'reinstate@test.local',
      suspended: true,
    });
    const res = await agent
      .patch(`/api/admin/users/${teacher.id}/suspension`)
      .send({ suspended: false });
    expect(res.status).toBe(200);
    expect(res.body.suspended).toBe(false);
    // now login should succeed
    await login(app, 'reinstate@test.local');
  });

  it('returns 404 when suspending an admin', async () => {
    const agent = await adminAgent();
    const otherAdmin = await seedUser(db, { role: 'admin' });
    const res = await agent
      .patch(`/api/admin/users/${otherAdmin.id}/suspension`)
      .send({ suspended: true });
    expect(res.status).toBe(404);
  });

  it('returns 404 when suspending a missing user', async () => {
    const agent = await adminAgent();
    const res = await agent
      .patch(`/api/admin/users/${MISSING_ID}/suspension`)
      .send({ suspended: true });
    expect(res.status).toBe(404);
  });

  it('rejects a non-boolean suspended value with 400', async () => {
    const agent = await adminAgent();
    const student = await seedUser(db, { role: 'student' });
    const res = await agent
      .patch(`/api/admin/users/${student.id}/suspension`)
      .send({ suspended: 'yes' });
    expect(res.status).toBe(400);
  });
});
