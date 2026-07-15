import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { makeTestDb, makeTestRedis, resetDb } from '../test/db.js';
import { login, seedUser } from '../test/factory.js';

const db = makeTestDb();
const redis = makeTestRedis();
let app: FastifyInstance;

const NIL = '00000000-0000-0000-0000-000000000000';
const future = () => new Date(Date.now() + 86_400_000).toISOString();

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

// Seed a teacher, return {agent, id}.
async function teacher(email: string) {
  const u = await seedUser(db, { role: 'teacher', email });
  return { agent: await login(app, email), id: u.id };
}

// Create a class owned by the given teacher agent; return the class id.
async function makeClass(agent: Awaited<ReturnType<typeof login>>, name = 'Math') {
  const res = await agent.post('/api/teacher/classes').send({ name });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe('teacher routes', () => {
  describe('authz', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app.server).get('/api/teacher/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects a non-teacher (student) with 403', async () => {
      await seedUser(db, { role: 'student', email: 's@test.local' });
      const agent = await login(app, 's@test.local');
      const res = await agent.get('/api/teacher/dashboard');
      expect(res.status).toBe(403);
    });

    it('rejects an admin from teacher routes with 403', async () => {
      await seedUser(db, { role: 'admin', email: 'ad@test.local' });
      const agent = await login(app, 'ad@test.local');
      const res = await agent.get('/api/teacher/dashboard');
      expect(res.status).toBe(403);
    });
  });

  describe('dashboard', () => {
    it('returns classes and pending count', async () => {
      const t = await teacher('t1@test.local');
      await makeClass(t.agent);
      const res = await t.agent.get('/api/teacher/dashboard');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.classes)).toBe(true);
      expect(res.body.classes).toHaveLength(1);
      expect(res.body.pending).toBe(0);
    });

    it('counts submitted-but-ungraded submissions as pending', async () => {
      const t = await teacher('t2@test.local');
      const classId = await makeClass(t.agent);
      const asg = await t.agent
        .post(`/api/teacher/classes/${classId}/assignments`)
        .send({ title: 'HW1', description: 'do it', dueAt: future() });
      const student = await seedUser(db, { role: 'student', email: 'st@test.local' });
      await t.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: student.id })
        .expect(201);
      const sAgent = await login(app, 'st@test.local');
      await sAgent
        .post(`/api/student/assignments/${asg.body.id}/submit`)
        .send({ content: 'my answer' })
        .expect(201);
      const res = await t.agent.get('/api/teacher/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.pending).toBe(1);
    });
  });

  describe('class CRUD + ownership', () => {
    it('creates, updates and deletes a class', async () => {
      const t = await teacher('t3@test.local');
      const classId = await makeClass(t.agent, 'History');

      const upd = await t.agent
        .put(`/api/teacher/classes/${classId}`)
        .send({ name: 'World History' });
      expect(upd.status).toBe(200);
      expect(upd.body.name).toBe('World History');

      const del = await t.agent.delete(`/api/teacher/classes/${classId}`);
      expect(del.status).toBe(200);
      expect(del.body.ok).toBe(true);

      const after = await t.agent.get('/api/teacher/classes');
      expect(after.body).toHaveLength(0);
    });

    it('validates the class body (400 on empty name)', async () => {
      const t = await teacher('t4@test.local');
      const res = await t.agent.post('/api/teacher/classes').send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('returns 404 updating a missing class', async () => {
      const t = await teacher('t5@test.local');
      const res = await t.agent
        .put(`/api/teacher/classes/${NIL}`)
        .send({ name: 'x' });
      expect(res.status).toBe(404);
    });

    it("returns 403 when acting on another teacher's class", async () => {
      const owner = await teacher('owner@test.local');
      const other = await teacher('other@test.local');
      const classId = await makeClass(owner.agent);

      const upd = await other.agent
        .put(`/api/teacher/classes/${classId}`)
        .send({ name: 'hijack' });
      expect(upd.status).toBe(403);

      const del = await other.agent.delete(`/api/teacher/classes/${classId}`);
      expect(del.status).toBe(403);
    });
  });

  describe('enrollment', () => {
    it('enrolls a valid student and lists them', async () => {
      const t = await teacher('t6@test.local');
      const classId = await makeClass(t.agent);
      const student = await seedUser(db, { role: 'student', email: 'en@test.local' });

      const res = await t.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: student.id });
      expect(res.status).toBe(201);

      const list = await t.agent.get(`/api/teacher/classes/${classId}/students`);
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].email).toBe('en@test.local');
    });

    it('rejects enrolling a non-student (400)', async () => {
      const t = await teacher('t7@test.local');
      const classId = await makeClass(t.agent);
      const notStudent = await seedUser(db, { role: 'teacher', email: 'nt@test.local' });

      const res = await t.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: notStudent.id });
      expect(res.status).toBe(400);
    });

    it('removes an enrolled student', async () => {
      const t = await teacher('t8@test.local');
      const classId = await makeClass(t.agent);
      const student = await seedUser(db, { role: 'student', email: 'rm@test.local' });
      await t.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: student.id })
        .expect(201);

      const del = await t.agent.delete(
        `/api/teacher/classes/${classId}/students/${student.id}`
      );
      expect(del.status).toBe(200);

      const list = await t.agent.get(`/api/teacher/classes/${classId}/students`);
      expect(list.body).toHaveLength(0);
    });

    it("returns 403 enrolling into another teacher's class", async () => {
      const owner = await teacher('own2@test.local');
      const other = await teacher('oth2@test.local');
      const classId = await makeClass(owner.agent);
      const student = await seedUser(db, { role: 'student', email: 'en2@test.local' });

      const res = await other.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: student.id });
      expect(res.status).toBe(403);
    });
  });

  describe('assignments', () => {
    it('creates, lists and deletes an assignment', async () => {
      const t = await teacher('t9@test.local');
      const classId = await makeClass(t.agent);

      const created = await t.agent
        .post(`/api/teacher/classes/${classId}/assignments`)
        .send({ title: 'Essay', description: 'write', dueAt: future() });
      expect(created.status).toBe(201);
      expect(created.body.title).toBe('Essay');
      expect(created.body.classId).toBe(classId);

      const list = await t.agent.get(`/api/teacher/classes/${classId}/assignments`);
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);

      const del = await t.agent.delete(
        `/api/teacher/classes/${classId}/assignments/${created.body.id}`
      );
      expect(del.status).toBe(200);

      const after = await t.agent.get(`/api/teacher/classes/${classId}/assignments`);
      expect(after.body).toHaveLength(0);
    });

    it('validates assignment body (400 on bad dueAt)', async () => {
      const t = await teacher('t10@test.local');
      const classId = await makeClass(t.agent);
      const res = await t.agent
        .post(`/api/teacher/classes/${classId}/assignments`)
        .send({ title: 'x', description: '', dueAt: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it("returns 403 creating an assignment in another teacher's class", async () => {
      const owner = await teacher('own3@test.local');
      const other = await teacher('oth3@test.local');
      const classId = await makeClass(owner.agent);
      const res = await other.agent
        .post(`/api/teacher/classes/${classId}/assignments`)
        .send({ title: 'x', description: '', dueAt: future() });
      expect(res.status).toBe(403);
    });
  });

  describe('submissions + grading', () => {
    // Build class + enrolled student + submitted assignment; return ids.
    async function setup(prefix: string) {
      const t = await teacher(`${prefix}-teach@test.local`);
      const classId = await makeClass(t.agent);
      const asg = await t.agent
        .post(`/api/teacher/classes/${classId}/assignments`)
        .send({ title: 'HW', description: '', dueAt: future() });
      const student = await seedUser(db, {
        role: 'student',
        email: `${prefix}-stu@test.local`,
      });
      await t.agent
        .post(`/api/teacher/classes/${classId}/students`)
        .send({ studentId: student.id })
        .expect(201);
      const sAgent = await login(app, `${prefix}-stu@test.local`);
      const sub = await sAgent
        .post(`/api/student/assignments/${asg.body.id}/submit`)
        .send({ content: 'answer' });
      expect(sub.status).toBe(201);
      return { t, classId, assignmentId: asg.body.id as string, submissionId: sub.body.id as string };
    }

    it('lists submissions for an assignment', async () => {
      const { t, classId, assignmentId } = await setup('list');
      const res = await t.agent.get(
        `/api/teacher/classes/${classId}/assignments/${assignmentId}/submissions`
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('submitted');
      expect(res.body[0].score).toBeNull();
    });

    it('grades a submission and the submission then shows graded', async () => {
      const { t, classId, assignmentId, submissionId } = await setup('grade');

      const graded = await t.agent
        .post(`/api/teacher/submissions/${submissionId}/grade`)
        .send({ score: 92, feedback: 'nice' });
      expect(graded.status).toBe(200);
      expect(graded.body.score).toBe(92);
      expect(graded.body.feedback).toBe('nice');

      const list = await t.agent.get(
        `/api/teacher/classes/${classId}/assignments/${assignmentId}/submissions`
      );
      expect(list.body[0].status).toBe('graded');
      expect(list.body[0].score).toBe(92);
      expect(list.body[0].feedback).toBe('nice');
    });

    it('validates the grade body (400 on out-of-range score)', async () => {
      const { t, submissionId } = await setup('valid');
      const res = await t.agent
        .post(`/api/teacher/submissions/${submissionId}/grade`)
        .send({ score: 150, feedback: '' });
      expect(res.status).toBe(400);
    });

    it('returns 404 grading a missing submission', async () => {
      const t = await teacher('nf-grade@test.local');
      const res = await t.agent
        .post(`/api/teacher/submissions/${NIL}/grade`)
        .send({ score: 50, feedback: '' });
      expect(res.status).toBe(404);
    });

    it("returns 403 grading another teacher's submission", async () => {
      const { submissionId } = await setup('own');
      const other = await teacher('oth-grade@test.local');
      const res = await other.agent
        .post(`/api/teacher/submissions/${submissionId}/grade`)
        .send({ score: 70, feedback: '' });
      expect(res.status).toBe(403);
    });

    it("returns 403 listing submissions for another teacher's class", async () => {
      const { classId, assignmentId } = await setup('own2');
      const other = await teacher('oth-list@test.local');
      const res = await other.agent.get(
        `/api/teacher/classes/${classId}/assignments/${assignmentId}/submissions`
      );
      expect(res.status).toBe(403);
    });
  });
});
