import { sql, type Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import type { GradeInput } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { cacheInvalidate } from '../redis.js';
import { STATS_CACHE_PREFIX } from './stats.js';
import { forbidden, notFound } from './errors.js';

export async function gradeSubmission(
  db: Kysely<Database>,
  redis: Redis,
  teacherId: string,
  submissionId: string,
  input: GradeInput
): Promise<{ score: number; feedback: string }> {
  const owner = await db
    .selectFrom('submissions as s')
    .innerJoin('assignments as a', 'a.id', 's.assignment_id')
    .innerJoin('classes as c', 'c.id', 'a.class_id')
    .select('c.teacher_id as teacherId')
    .where('s.id', '=', submissionId)
    .executeTakeFirst();
  if (!owner) throw notFound('submission not found');
  if (owner.teacherId !== teacherId)
    throw forbidden('not your class');

  await db
    .insertInto('grades')
    .values({
      submission_id: submissionId,
      score: input.score,
      feedback: input.feedback,
    })
    .onConflict((oc) =>
      oc.column('submission_id').doUpdateSet({
        score: input.score,
        feedback: input.feedback,
        graded_at: sql`now()`,
      })
    )
    .execute();

  await db
    .updateTable('submissions')
    .set({ status: 'graded' })
    .where('id', '=', submissionId)
    .execute();

  await cacheInvalidate(redis, STATS_CACHE_PREFIX);
  return { score: input.score, feedback: input.feedback };
}
