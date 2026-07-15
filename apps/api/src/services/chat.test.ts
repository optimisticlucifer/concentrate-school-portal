import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTestDb, resetDb } from '../test/db.js';
import { seedUser } from '../test/factory.js';
import { buildContext, chat } from './chat.js';

const db = makeTestDb();

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.destroy();
});

async function seedTeacherWithClass() {
  const teacher = await seedUser(db, { role: 'teacher' });
  const student = await seedUser(db, { role: 'student' });
  const cls = await db
    .insertInto('classes')
    .values({ name: 'Algebra', teacher_id: teacher.id })
    .returning('id')
    .executeTakeFirstOrThrow();
  await db
    .insertInto('enrollments')
    .values({ class_id: cls.id, student_id: student.id })
    .execute();
  return { teacher, student, classId: cls.id };
}

describe('buildContext', () => {
  it('admin context reports user role counts', async () => {
    await seedUser(db, { role: 'admin' });
    await seedUser(db, { role: 'teacher' });
    await seedUser(db, { role: 'student' });
    await seedUser(db, { role: 'student' });
    const admin = await seedUser(db, { role: 'admin' });

    const ctx = await buildContext(db, admin.id, 'admin');

    expect(ctx).toContain('Role: admin');
    const counts = JSON.parse(ctx.split('User counts: ')[1].replace(/\.$/, ''));
    expect(counts).toEqual({ admin: 2, teacher: 1, student: 2 });
  });

  it('teacher context lists classes with student counts and pending grading', async () => {
    const { teacher, student, classId } = await seedTeacherWithClass();
    const assignment = await db
      .insertInto('assignments')
      .values({
        class_id: classId,
        title: 'HW1',
        description: 'do it',
        due_at: new Date(Date.now() + 86_400_000),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('submissions')
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        content: 'answer',
        status: 'submitted',
      })
      .execute();

    const ctx = await buildContext(db, teacher.id, 'teacher');

    expect(ctx).toContain('Role: teacher');
    expect(ctx).toContain('Submissions awaiting grading: 1');
    expect(ctx).toContain('- Algebra: 1 students');
  });

  it('teacher context with no classes says (none)', async () => {
    const teacher = await seedUser(db, { role: 'teacher' });
    const ctx = await buildContext(db, teacher.id, 'teacher');
    expect(ctx).toContain('Submissions awaiting grading: 0');
    expect(ctx).toContain('(none)');
  });

  it('student context lists assignments and average', async () => {
    const { student, classId } = await seedTeacherWithClass();
    const assignment = await db
      .insertInto('assignments')
      .values({
        class_id: classId,
        title: 'Essay',
        description: 'write it',
        due_at: new Date(Date.now() + 86_400_000),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const sub = await db
      .insertInto('submissions')
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        content: 'my essay',
        status: 'graded',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('grades')
      .values({ submission_id: sub.id, score: 90, feedback: 'good' })
      .execute();

    const ctx = await buildContext(db, student.id, 'student');

    expect(ctx).toContain('Role: student');
    expect(ctx).toContain('Average grade: 90');
    expect(ctx).toContain('"Essay" (Algebra)');
    expect(ctx).toContain('score 90');
  });

  it('student context with no assignments says none/(none)', async () => {
    const student = await seedUser(db, { role: 'student' });
    const ctx = await buildContext(db, student.id, 'student');
    expect(ctx).toContain('Average grade: none');
    expect(ctx).toContain('(none)');
  });
});

describe('chat (default: unconfigured)', () => {
  it('returns the not-configured reply when ANTHROPIC_API_KEY is empty', async () => {
    const student = await seedUser(db, { role: 'student' });
    const res = await chat(db, student.id, 'student', 'hello');
    expect(res.reply).toBe(
      'The assistant is not configured on this deployment.'
    );
  });
});

describe('chat (configured via env stub + re-import)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns the assistant reply on a successful fetch', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.resetModules();
    const { chat: chatConfigured } = await import('./chat.js');

    const student = await seedUser(db, { role: 'student' });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ text: 'hi' }] }),
    })) as unknown as typeof fetch;

    const res = await chatConfigured(
      db,
      student.id,
      'student',
      'how am I doing?',
      fetchImpl
    );

    expect(res.reply).toBe('hi');
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init as { headers: Record<string, string> }).headers['x-api-key']).toBe('k');
  });

  it('throws when the fetch response is not ok', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.resetModules();
    const { chat: chatConfigured } = await import('./chat.js');

    const student = await seedUser(db, { role: 'student' });
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    await expect(
      chatConfigured(db, student.id, 'student', 'hi', fetchImpl)
    ).rejects.toThrow('assistant request failed');
  });
});
