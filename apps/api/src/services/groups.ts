import type { Kysely } from 'kysely';
import type { TeacherGroupInput } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { badRequest, notFound } from './errors.js';

export interface GroupDTO {
  id: string;
  name: string;
  teachers: { id: string; name: string }[];
}

async function membersOf(
  db: Kysely<Database>,
  groupId: string
): Promise<{ id: string; name: string }[]> {
  return db
    .selectFrom('teacher_group_members as m')
    .innerJoin('users as u', 'u.id', 'm.teacher_id')
    .select(['u.id as id', 'u.name as name'])
    .where('m.group_id', '=', groupId)
    .orderBy('u.name')
    .execute();
}

async function assertAllTeachers(
  db: Kysely<Database>,
  teacherIds: string[]
): Promise<void> {
  if (teacherIds.length === 0) return;
  const rows = await db
    .selectFrom('users')
    .select('id')
    .where('id', 'in', teacherIds)
    .where('role', '=', 'teacher')
    .execute();
  if (rows.length !== new Set(teacherIds).size)
    throw badRequest('all members must be existing teachers');
}

export async function listGroups(db: Kysely<Database>): Promise<GroupDTO[]> {
  const groups = await db
    .selectFrom('teacher_groups')
    .select(['id', 'name'])
    .orderBy('name')
    .execute();
  return Promise.all(
    groups.map(async (g) => ({ ...g, teachers: await membersOf(db, g.id) }))
  );
}

export async function createGroup(
  db: Kysely<Database>,
  input: TeacherGroupInput
): Promise<GroupDTO> {
  await assertAllTeachers(db, input.teacherIds);
  const group = await db
    .insertInto('teacher_groups')
    .values({ name: input.name })
    .returning(['id', 'name'])
    .executeTakeFirstOrThrow();
  if (input.teacherIds.length > 0)
    await db
      .insertInto('teacher_group_members')
      .values(input.teacherIds.map((teacher_id) => ({ group_id: group.id, teacher_id })))
      .execute();
  return { ...group, teachers: await membersOf(db, group.id) };
}

export async function updateGroup(
  db: Kysely<Database>,
  id: string,
  input: TeacherGroupInput
): Promise<GroupDTO> {
  await assertAllTeachers(db, input.teacherIds);
  const group = await db
    .updateTable('teacher_groups')
    .set({ name: input.name })
    .where('id', '=', id)
    .returning(['id', 'name'])
    .executeTakeFirst();
  if (!group) throw notFound('group not found');
  await db
    .deleteFrom('teacher_group_members')
    .where('group_id', '=', id)
    .execute();
  if (input.teacherIds.length > 0)
    await db
      .insertInto('teacher_group_members')
      .values(input.teacherIds.map((teacher_id) => ({ group_id: id, teacher_id })))
      .execute();
  return { ...group, teachers: await membersOf(db, id) };
}

export async function deleteGroup(
  db: Kysely<Database>,
  id: string
): Promise<void> {
  const res = await db
    .deleteFrom('teacher_groups')
    .where('id', '=', id)
    .executeTakeFirst();
  if (res.numDeletedRows === 0n) throw notFound('group not found');
}
