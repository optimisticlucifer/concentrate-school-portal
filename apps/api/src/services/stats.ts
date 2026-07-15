import type { Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import type { Database } from '../db/types.js';
import { cacheGet, cacheSet } from '../redis.js';
import { notFound } from './errors.js';

export const STATS_CACHE_PREFIX = 'stats:';
const TTL = 60;

async function cached<T>(
  redis: Redis,
  key: string,
  compute: () => Promise<T>
): Promise<T> {
  try {
    const hit = await cacheGet<T>(redis, STATS_CACHE_PREFIX + key);
    if (hit !== null) return hit;
  } catch {
    // Redis unavailable — degrade to DB.
  }
  const value = await compute();
  try {
    await cacheSet(redis, STATS_CACHE_PREFIX + key, value, TTL);
  } catch {
    // best-effort cache write
  }
  return value;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function classExists(
  db: Kysely<Database>,
  id: string
): Promise<boolean> {
  const row = await db
    .selectFrom('classes')
    .select('id')
    .where('id', '=', id)
    .executeTakeFirst();
  return row !== undefined;
}

export async function averageGrades(
  db: Kysely<Database>,
  redis: Redis
): Promise<{ average: number | null }> {
  return cached(redis, 'avg', async () => {
    const row = await db
      .selectFrom('grades')
      .select(({ fn }) => fn.avg<number | null>('score').as('avg'))
      .executeTakeFirst();
    const avg = row?.avg;
    return { average: avg === null || avg === undefined ? null : round2(Number(avg)) };
  });
}

export async function averageGradesForClass(
  db: Kysely<Database>,
  redis: Redis,
  classId: string
): Promise<{ classId: string; average: number | null }> {
  if (!(await classExists(db, classId))) throw notFound('class not found');
  return cached(redis, `avg:${classId}`, async () => {
    const row = await db
      .selectFrom('grades as g')
      .innerJoin('submissions as s', 's.id', 'g.submission_id')
      .innerJoin('assignments as a', 'a.id', 's.assignment_id')
      .select(({ fn }) => fn.avg<number | null>('g.score').as('avg'))
      .where('a.class_id', '=', classId)
      .executeTakeFirst();
    const avg = row?.avg;
    return {
      classId,
      average: avg === null || avg === undefined ? null : round2(Number(avg)),
    };
  });
}

export async function teacherNames(
  db: Kysely<Database>,
  redis: Redis
): Promise<string[]> {
  return cached(redis, 'teachers', async () => {
    const rows = await db
      .selectFrom('users')
      .select('name')
      .where('role', '=', 'teacher')
      .orderBy('name')
      .execute();
    return rows.map((r) => r.name);
  });
}

export async function studentNames(
  db: Kysely<Database>,
  redis: Redis
): Promise<string[]> {
  return cached(redis, 'students', async () => {
    const rows = await db
      .selectFrom('users')
      .select('name')
      .where('role', '=', 'student')
      .orderBy('name')
      .execute();
    return rows.map((r) => r.name);
  });
}

export async function listAllClasses(
  db: Kysely<Database>,
  redis: Redis
): Promise<{ id: string; name: string; teacherName: string }[]> {
  return cached(redis, 'classes', async () =>
    db
      .selectFrom('classes as c')
      .innerJoin('users as t', 't.id', 'c.teacher_id')
      .select(['c.id as id', 'c.name as name', 't.name as teacherName'])
      .orderBy('c.name')
      .execute()
  );
}

export async function studentsInClass(
  db: Kysely<Database>,
  redis: Redis,
  classId: string
): Promise<{ id: string; name: string }[]> {
  if (!(await classExists(db, classId))) throw notFound('class not found');
  return cached(redis, `class:${classId}`, async () =>
    db
      .selectFrom('enrollments as e')
      .innerJoin('users as u', 'u.id', 'e.student_id')
      .select(['u.id as id', 'u.name as name'])
      .where('e.class_id', '=', classId)
      .orderBy('u.name')
      .execute()
  );
}
