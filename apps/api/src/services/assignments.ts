import type { Kysely } from 'kysely';
import type { AssignmentInput } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { assertClassOwner } from './classes.js';

export interface AssignmentDTO {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
}

const toDTO = (r: {
  id: string;
  class_id: string;
  title: string;
  description: string;
  due_at: Date;
}): AssignmentDTO => ({
  id: r.id,
  classId: r.class_id,
  title: r.title,
  description: r.description,
  dueAt: r.due_at.toISOString(),
});

export async function listAssignmentsForClass(
  db: Kysely<Database>,
  classId: string
): Promise<AssignmentDTO[]> {
  const rows = await db
    .selectFrom('assignments')
    .select(['id', 'class_id', 'title', 'description', 'due_at'])
    .where('class_id', '=', classId)
    .orderBy('due_at')
    .execute();
  return rows.map(toDTO);
}

export async function createAssignment(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  input: AssignmentInput
): Promise<AssignmentDTO> {
  await assertClassOwner(db, teacherId, classId);
  const row = await db
    .insertInto('assignments')
    .values({
      class_id: classId,
      title: input.title,
      description: input.description,
      due_at: input.dueAt,
    })
    .returning(['id', 'class_id', 'title', 'description', 'due_at'])
    .executeTakeFirstOrThrow();
  return toDTO(row);
}

export async function deleteAssignment(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  assignmentId: string
): Promise<void> {
  await assertClassOwner(db, teacherId, classId);
  await db
    .deleteFrom('assignments')
    .where('id', '=', assignmentId)
    .where('class_id', '=', classId)
    .execute();
}
