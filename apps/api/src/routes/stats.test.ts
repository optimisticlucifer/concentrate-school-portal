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

/**
 * Builds a full graph via the API: teacher + class + enrolled student +
 * assignment + student submission + a grade of `score`.
 * Returns the ids the stats endpoints key off.
 */
async function seedGraph(score: number): Promise<{
  classId: string;
  teacherName: string;
  studentName: string;
}> {
  const teacher = await seedUser(db, {
    role: 'teacher',
    email: 'teach@test.local',
    name: 'Terry Teacher',
  });
  const student = await seedUser(db, {
    role: 'student',
    email: 'stud@test.local',
    name: 'Sam Student',
  });

  const tAgent = await login(app, teacher.email);
  const sAgent = await login(app, student.email);

  const classRes = await tAgent
    .post('/api/teacher/classes')
    .send({ name: 'Algebra' });
  expect(classRes.status).toBe(201);
  const classId = classRes.body.id as string;

  await tAgent
    .post(`/api/teacher/classes/${classId}/students`)
    .send({ studentId: student.id })
    .expect(201);

  const asgRes = await tAgent
    .post(`/api/teacher/classes/${classId}/assignments`)
    .send({
      title: 'HW1',
      description: 'do it',
      dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
  expect(asgRes.status).toBe(201);
  const assignmentId = asgRes.body.id as string;

  const subRes = await sAgent
    .post(`/api/student/assignments/${assignmentId}/submit`)
    .send({ content: 'my answer' });
  expect(subRes.status).toBe(201);
  const submissionId = subRes.body.id as string;

  const gradeRes = await tAgent
    .post(`/api/teacher/submissions/${submissionId}/grade`)
    .send({ score, feedback: 'good' });
  expect(gradeRes.status).toBe(200);

  return { classId, teacherName: 'Terry Teacher', studentName: 'Sam Student' };
}

describe('stats routes', () => {
  it('average-grades reflects the seeded grade', async () => {
    await seedGraph(87);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get('/api/v0/stats/average-grades');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ average: 87 });
  });

  it('average-grades is null with no grades', async () => {
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get('/api/v0/stats/average-grades');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ average: null });
  });

  it('average-grades/:id returns the class average', async () => {
    const { classId } = await seedGraph(90);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get(`/api/v0/stats/average-grades/${classId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ classId, average: 90 });
  });

  it('average-grades/:id returns 404 for a missing class', async () => {
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get(`/api/v0/stats/average-grades/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('teacher-names lists teacher names', async () => {
    await seedGraph(70);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get('/api/v0/stats/teacher-names');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Terry Teacher');
    expect(res.body).not.toContain('Sam Student');
  });

  it('student-names lists student names', async () => {
    await seedGraph(70);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get('/api/v0/stats/student-names');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Sam Student');
    expect(res.body).not.toContain('Terry Teacher');
  });

  it('classes returns id/name/teacherName rows', async () => {
    const { classId } = await seedGraph(70);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get('/api/v0/stats/classes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: classId, name: 'Algebra', teacherName: 'Terry Teacher' },
    ]);
  });

  it('classes/:id lists enrolled students', async () => {
    const { classId } = await seedGraph(70);
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get(`/api/v0/stats/classes/${classId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Sam Student');
    expect(typeof res.body[0].id).toBe('string');
  });

  it('classes/:id returns 404 for a missing class', async () => {
    const admin = await seedUser(db, { role: 'admin', email: 'ad@test.local' });
    const agent = await login(app, admin.email);
    const res = await agent.get(`/api/v0/stats/classes/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('allows a teacher to read stats', async () => {
    const t = await seedUser(db, { role: 'teacher', email: 't2@test.local' });
    const agent = await login(app, t.email);
    const res = await agent.get('/api/v0/stats/average-grades');
    expect(res.status).toBe(200);
  });

  it('forbids a student (403)', async () => {
    const s = await seedUser(db, { role: 'student', email: 's2@test.local' });
    const agent = await login(app, s.email);
    const res = await agent.get('/api/v0/stats/average-grades');
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app.server).get('/api/v0/stats/average-grades');
    expect(res.status).toBe(401);
  });
});
