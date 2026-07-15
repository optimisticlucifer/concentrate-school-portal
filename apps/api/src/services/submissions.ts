import { sql, type Kysely } from 'kysely';
import type { SubmissionInput, SubmissionStatus } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { assertClassOwner } from './classes.js';
import { conflict, forbidden, notFound } from './errors.js';

export interface SubmissionDTO {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
}

export async function submitAssignment(
  db: Kysely<Database>,
  studentId: string,
  assignmentId: string,
  input: SubmissionInput
): Promise<{ id: string }> {
  const assignment = await db
    .selectFrom('assignments')
    .select(['id', 'class_id'])
    .where('id', '=', assignmentId)
    .executeTakeFirst();
  if (!assignment) throw notFound('assignment not found');

  const enrolled = await db
    .selectFrom('enrollments')
    .select('student_id')
    .where('class_id', '=', assignment.class_id)
    .where('student_id', '=', studentId)
    .executeTakeFirst();
  if (!enrolled) throw forbidden('not enrolled in this class');

  const existing = await db
    .selectFrom('submissions')
    .select(['id', 'status'])
    .where('assignment_id', '=', assignmentId)
    .where('student_id', '=', studentId)
    .executeTakeFirst();
  if (existing && existing.status === 'graded')
    throw conflict('already graded, cannot resubmit');

  const row = await db
    .insertInto('submissions')
    .values({
      assignment_id: assignmentId,
      student_id: studentId,
      content: input.content,
      status: 'submitted',
    })
    .onConflict((oc) =>
      oc.columns(['assignment_id', 'student_id']).doUpdateSet({
        content: input.content,
        submitted_at: sql`now()`,
        status: 'submitted',
      })
    )
    .returning('id')
    .executeTakeFirstOrThrow();
  return row;
}

export async function listSubmissionsForAssignment(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  assignmentId: string
): Promise<SubmissionDTO[]> {
  await assertClassOwner(db, teacherId, classId);
  const rows = await db
    .selectFrom('submissions as s')
    .innerJoin('users as u', 'u.id', 's.student_id')
    .leftJoin('grades as g', 'g.submission_id', 's.id')
    .select([
      's.id as id',
      's.assignment_id as assignmentId',
      's.student_id as studentId',
      'u.name as studentName',
      's.content as content',
      's.submitted_at as submittedAt',
      's.status as status',
      'g.score as score',
      'g.feedback as feedback',
    ])
    .where('s.assignment_id', '=', assignmentId)
    .orderBy('u.name')
    .execute();
  return rows.map((r) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    score: r.score,
    feedback: r.feedback,
  }));
}

export async function countPendingForTeacher(
  db: Kysely<Database>,
  teacherId: string
): Promise<number> {
  const row = await db
    .selectFrom('submissions as s')
    .innerJoin('assignments as a', 'a.id', 's.assignment_id')
    .innerJoin('classes as c', 'c.id', 'a.class_id')
    .select(({ fn }) => fn.count<number>('s.id').as('c'))
    .where('c.teacher_id', '=', teacherId)
    .where('s.status', '=', 'submitted')
    .executeTakeFirstOrThrow();
  return Number(row.c);
}
