import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { makeTestDb, makeTestRedis, resetDb } from '../test/db.js';
import { login, seedUser } from '../test/factory.js';

const db = makeTestDb();
const redis = makeTestRedis();
let app: FastifyInstance;

const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000000';
const iso = (offsetMs: number): string =>
  new Date(Date.now() + offsetMs).toISOString();

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

// Drives fixtures through the teacher API so the test exercises the real flow.
// Returns ids the student tests need plus the teacher agent (for authz checks).
async function setupClassWithStudent(opts: {
  dueAt?: string;
  enroll?: boolean;
}) {
  const teacher = await seedUser(db, { role: 'teacher' });
  const student = await seedUser(db, { role: 'student' });
  const tAgent = await login(app, teacher.email);
  const sAgent = await login(app, student.email);

  const cls = await tAgent
    .post('/api/teacher/classes')
    .send({ name: 'Math 101' })
    .expect(201);
  const classId = cls.body.id as string;

  if (opts.enroll !== false) {
    await tAgent
      .post(`/api/teacher/classes/${classId}/students`)
      .send({ studentId: student.id })
      .expect(201);
  }

  const asg = await tAgent
    .post(`/api/teacher/classes/${classId}/assignments`)
    .send({
      title: 'Homework 1',
      description: 'Do the thing',
      dueAt: opts.dueAt ?? iso(7 * 24 * 60 * 60 * 1000),
    })
    .expect(201);
  const assignmentId = asg.body.id as string;

  return { teacher, student, tAgent, sAgent, classId, assignmentId };
}

describe('student routes', () => {
  it('dashboard returns assignments/average/classes with derived state', async () => {
    // dueAt 10 days out -> not_started
    const { sAgent } = await setupClassWithStudent({
      dueAt: iso(10 * 24 * 60 * 60 * 1000),
    });

    const res = await sAgent.get('/api/student/dashboard').expect(200);
    expect(res.body).toHaveProperty('assignments');
    expect(res.body).toHaveProperty('average');
    expect(res.body).toHaveProperty('classes');
    expect(res.body.average).toBeNull();
    expect(res.body.classes).toHaveLength(1);
    expect(res.body.classes[0].teacherName).toBeTruthy();
    expect(res.body.assignments).toHaveLength(1);
    expect(res.body.assignments[0].state).toBe('not_started');
    expect(res.body.assignments[0].className).toBe('Math 101');
  });

  it('derives due_soon when the due date is within 3 days', async () => {
    const { sAgent } = await setupClassWithStudent({
      dueAt: iso(24 * 60 * 60 * 1000),
    });
    const res = await sAgent.get('/api/student/assignments').expect(200);
    expect(res.body[0].state).toBe('due_soon');
  });

  it('derives missing when the due date has passed and nothing was submitted', async () => {
    const { sAgent } = await setupClassWithStudent({
      dueAt: iso(-24 * 60 * 60 * 1000),
    });
    const res = await sAgent.get('/api/student/assignments').expect(200);
    expect(res.body[0].state).toBe('missing');
  });

  it('submits an assignment (201) and reflects submitted state + average after grading', async () => {
    const { tAgent, sAgent, classId, assignmentId } =
      await setupClassWithStudent({
        dueAt: iso(5 * 24 * 60 * 60 * 1000),
      });

    const submitRes = await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'my answer' })
      .expect(201);
    expect(submitRes.body.id).toBeTruthy();

    // before grading -> submitted, average still null
    let dash = await sAgent.get('/api/student/dashboard').expect(200);
    expect(dash.body.assignments[0].state).toBe('submitted');
    expect(dash.body.assignments[0].content).toBe('my answer');
    expect(dash.body.average).toBeNull();

    // teacher grades it
    const subs = await tAgent
      .get(`/api/teacher/classes/${classId}/assignments/${assignmentId}/submissions`)
      .expect(200);
    const submissionId = subs.body[0].id as string;
    await tAgent
      .post(`/api/teacher/submissions/${submissionId}/grade`)
      .send({ score: 90, feedback: 'nice' })
      .expect(200);

    // after grading -> graded state, score/feedback populated, average computed
    dash = await sAgent.get('/api/student/dashboard').expect(200);
    expect(dash.body.assignments[0].state).toBe('graded');
    expect(dash.body.assignments[0].score).toBe(90);
    expect(dash.body.assignments[0].feedback).toBe('nice');
    expect(dash.body.average).toBe(90);
  });

  it('rejects submit when the student is not enrolled (403)', async () => {
    const { sAgent, assignmentId } = await setupClassWithStudent({
      enroll: false,
    });
    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'x' })
      .expect(403);
  });

  it('returns 404 when the assignment does not exist', async () => {
    const student = await seedUser(db, { role: 'student' });
    const sAgent = await login(app, student.email);
    await sAgent
      .post(`/api/student/assignments/${NOT_FOUND_ID}/submit`)
      .send({ content: 'x' })
      .expect(404);
  });

  it('returns 409 when resubmitting after being graded', async () => {
    const { tAgent, sAgent, classId, assignmentId } =
      await setupClassWithStudent({});

    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'first' })
      .expect(201);

    const subs = await tAgent
      .get(`/api/teacher/classes/${classId}/assignments/${assignmentId}/submissions`)
      .expect(200);
    await tAgent
      .post(`/api/teacher/submissions/${subs.body[0].id}/grade`)
      .send({ score: 75, feedback: 'ok' })
      .expect(200);

    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'second' })
      .expect(409);
  });

  it('allows resubmission before grading (upsert, 201)', async () => {
    const { sAgent, assignmentId } = await setupClassWithStudent({});
    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'first' })
      .expect(201);
    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({ content: 'second' })
      .expect(201);
    const res = await sAgent.get('/api/student/assignments').expect(200);
    expect(res.body[0].content).toBe('second');
    expect(res.body[0].state).toBe('submitted');
  });

  it('validates the submit body (400)', async () => {
    const { sAgent, assignmentId } = await setupClassWithStudent({});
    await sAgent
      .post(`/api/student/assignments/${assignmentId}/submit`)
      .send({})
      .expect(400);
  });

  it('rejects a teacher hitting a student route (403)', async () => {
    const teacher = await seedUser(db, { role: 'teacher' });
    const tAgent = await login(app, teacher.email);
    await tAgent.get('/api/student/dashboard').expect(403);
  });

  it('rejects an unauthenticated request (401)', async () => {
    await request(app.server).get('/api/student/dashboard').expect(401);
  });
});
