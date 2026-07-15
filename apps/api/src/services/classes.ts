import type { Kysely } from 'kysely';
import type { ClassInput } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { badRequest, forbidden, notFound } from './errors.js';

export interface ClassDTO {
  id: string;
  name: string;
  teacherId: string;
  studentCount: number;
}

export async function assertClassOwner(
  db: Kysely<Database>,
  teacherId: string,
  classId: string
): Promise<void> {
  const row = await db
    .selectFrom('classes')
    .select('teacher_id')
    .where('id', '=', classId)
    .executeTakeFirst();
  if (!row) throw notFound('class not found');
  if (row.teacher_id !== teacherId) throw forbidden('not your class');
}

export async function listClassesForTeacher(
  db: Kysely<Database>,
  teacherId: string
): Promise<ClassDTO[]> {
  const rows = await db
    .selectFrom('classes as c')
    .leftJoin('enrollments as e', 'e.class_id', 'c.id')
    .select(({ fn }) => [
      'c.id as id',
      'c.name as name',
      'c.teacher_id as teacherId',
      fn.count<number>('e.student_id').as('studentCount'),
    ])
    .where('c.teacher_id', '=', teacherId)
    .groupBy(['c.id', 'c.name', 'c.teacher_id'])
    .orderBy('c.name')
    .execute();
  return rows.map((r) => ({ ...r, studentCount: Number(r.studentCount) }));
}

export async function listClassesForStudent(
  db: Kysely<Database>,
  studentId: string
): Promise<{ id: string; name: string; teacherName: string }[]> {
  return db
    .selectFrom('enrollments as e')
    .innerJoin('classes as c', 'c.id', 'e.class_id')
    .innerJoin('users as t', 't.id', 'c.teacher_id')
    .select(['c.id as id', 'c.name as name', 't.name as teacherName'])
    .where('e.student_id', '=', studentId)
    .orderBy('c.name')
    .execute();
}

export async function createClass(
  db: Kysely<Database>,
  teacherId: string,
  input: ClassInput
): Promise<ClassDTO> {
  const row = await db
    .insertInto('classes')
    .values({ name: input.name, teacher_id: teacherId })
    .returning(['id', 'name', 'teacher_id as teacherId'])
    .executeTakeFirstOrThrow();
  return { ...row, studentCount: 0 };
}

export async function updateClass(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  input: ClassInput
): Promise<ClassDTO> {
  await assertClassOwner(db, teacherId, classId);
  const row = await db
    .updateTable('classes')
    .set({ name: input.name })
    .where('id', '=', classId)
    .returning(['id', 'name', 'teacher_id as teacherId'])
    .executeTakeFirstOrThrow();
  const count = await db
    .selectFrom('enrollments')
    .select(({ fn }) => fn.count<number>('student_id').as('c'))
    .where('class_id', '=', classId)
    .executeTakeFirstOrThrow();
  return { ...row, studentCount: Number(count.c) };
}

export async function deleteClass(
  db: Kysely<Database>,
  teacherId: string,
  classId: string
): Promise<void> {
  await assertClassOwner(db, teacherId, classId);
  await db.deleteFrom('classes').where('id', '=', classId).execute();
}

export async function listStudentsInClass(
  db: Kysely<Database>,
  classId: string
): Promise<{ id: string; name: string; email: string }[]> {
  return db
    .selectFrom('enrollments as e')
    .innerJoin('users as u', 'u.id', 'e.student_id')
    .select(['u.id as id', 'u.name as name', 'u.email as email'])
    .where('e.class_id', '=', classId)
    .orderBy('u.name')
    .execute();
}

export async function enrollStudent(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  studentId: string
): Promise<void> {
  await assertClassOwner(db, teacherId, classId);
  const student = await db
    .selectFrom('users')
    .select('id')
    .where('id', '=', studentId)
    .where('role', '=', 'student')
    .executeTakeFirst();
  if (!student) throw badRequest('not a valid student');
  await db
    .insertInto('enrollments')
    .values({ class_id: classId, student_id: studentId })
    .onConflict((oc) => oc.columns(['class_id', 'student_id']).doNothing())
    .execute();
}

export async function removeStudent(
  db: Kysely<Database>,
  teacherId: string,
  classId: string,
  studentId: string
): Promise<void> {
  await assertClassOwner(db, teacherId, classId);
  await db
    .deleteFrom('enrollments')
    .where('class_id', '=', classId)
    .where('student_id', '=', studentId)
    .execute();
}
