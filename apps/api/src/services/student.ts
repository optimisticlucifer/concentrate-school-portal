import type { Kysely } from 'kysely';
import type { AssignmentState } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { deriveState } from './derive.js';

export interface StudentAssignmentDTO {
  id: string;
  title: string;
  description: string;
  className: string;
  dueAt: string;
  state: AssignmentState;
  content: string | null;
  score: number | null;
  feedback: string | null;
}

export async function listStudentAssignments(
  db: Kysely<Database>,
  studentId: string,
  now: Date = new Date()
): Promise<StudentAssignmentDTO[]> {
  const rows = await db
    .selectFrom('assignments as a')
    .innerJoin('classes as c', 'c.id', 'a.class_id')
    .innerJoin('enrollments as e', 'e.class_id', 'c.id')
    .leftJoin('submissions as s', (join) =>
      join
        .onRef('s.assignment_id', '=', 'a.id')
        .on('s.student_id', '=', studentId)
    )
    .leftJoin('grades as g', 'g.submission_id', 's.id')
    .select([
      'a.id as id',
      'a.title as title',
      'a.description as description',
      'c.name as className',
      'a.due_at as dueAt',
      's.content as content',
      's.submitted_at as submittedAt',
      's.status as status',
      'g.score as score',
      'g.feedback as feedback',
    ])
    .where('e.student_id', '=', studentId)
    .orderBy('a.due_at')
    .execute();

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    className: r.className,
    dueAt: r.dueAt.toISOString(),
    content: r.content,
    score: r.score,
    feedback: r.feedback,
    state: deriveState({
      submitted: r.status !== null,
      graded: r.status === 'graded',
      dueAt: r.dueAt,
      submittedAt: r.submittedAt,
      now,
    }),
  }));
}

export async function studentAverage(
  db: Kysely<Database>,
  studentId: string
): Promise<number | null> {
  const row = await db
    .selectFrom('grades as g')
    .innerJoin('submissions as s', 's.id', 'g.submission_id')
    .select(({ fn }) => fn.avg<number | null>('g.score').as('avg'))
    .where('s.student_id', '=', studentId)
    .executeTakeFirst();
  const avg = row?.avg;
  return avg === null || avg === undefined
    ? null
    : Math.round(Number(avg) * 100) / 100;
}
