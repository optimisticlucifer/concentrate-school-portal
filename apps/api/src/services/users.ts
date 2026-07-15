import type { Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import type {
  CreateUserInput,
  Role,
  UpdateUserInput,
  UserDTO,
} from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { hashPassword } from '../auth/password.js';
import { revokeAllSessions } from '../auth/session.js';
import { conflict, notFound } from './errors.js';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  suspended: boolean;
};

const toDTO = (u: UserRow): UserDTO => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  suspended: u.suspended,
});

const selectCols = ['id', 'email', 'name', 'role', 'suspended'] as const;

export async function getUserById(
  db: Kysely<Database>,
  id: string
): Promise<UserDTO | undefined> {
  const row = await db
    .selectFrom('users')
    .select(selectCols)
    .where('id', '=', id)
    .executeTakeFirst();
  return row ? toDTO(row) : undefined;
}

export async function getCredentialsByEmail(
  db: Kysely<Database>,
  email: string
): Promise<{ id: string; role: Role; passwordHash: string | null; suspended: boolean } | undefined> {
  const row = await db
    .selectFrom('users')
    .select(['id', 'role', 'password_hash', 'suspended'])
    .where('email', '=', email)
    .executeTakeFirst();
  return row
    ? {
        id: row.id,
        role: row.role,
        passwordHash: row.password_hash,
        suspended: row.suspended,
      }
    : undefined;
}

export async function listUsers(db: Kysely<Database>): Promise<UserDTO[]> {
  const rows = await db
    .selectFrom('users')
    .select(selectCols)
    .orderBy('name')
    .execute();
  return rows.map(toDTO);
}

export async function listStudents(
  db: Kysely<Database>
): Promise<{ id: string; name: string; email: string }[]> {
  return db
    .selectFrom('users')
    .select(['id', 'name', 'email'])
    .where('role', '=', 'student')
    .where('suspended', '=', false)
    .orderBy('name')
    .execute();
}

export async function createUser(
  db: Kysely<Database>,
  input: CreateUserInput
): Promise<UserDTO> {
  const exists = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', input.email)
    .executeTakeFirst();
  if (exists) throw conflict('email already in use');

  const passwordHash = await hashPassword(input.password);
  const row = await db
    .insertInto('users')
    .values({
      email: input.email,
      name: input.name,
      role: input.role,
      password_hash: passwordHash,
    })
    .returning(selectCols)
    .executeTakeFirstOrThrow();
  return toDTO(row);
}

export async function updateUser(
  db: Kysely<Database>,
  id: string,
  input: UpdateUserInput
): Promise<UserDTO> {
  const row = await db
    .updateTable('users')
    .set({ name: input.name, role: input.role })
    .where('id', '=', id)
    .returning(selectCols)
    .executeTakeFirst();
  if (!row) throw notFound('user not found');
  return toDTO(row);
}

export async function deleteUser(
  db: Kysely<Database>,
  id: string
): Promise<void> {
  const res = await db.deleteFrom('users').where('id', '=', id).executeTakeFirst();
  if (res.numDeletedRows === 0n) throw notFound('user not found');
}

export async function setSuspended(
  db: Kysely<Database>,
  redis: Redis,
  id: string,
  suspended: boolean
): Promise<UserDTO> {
  const row = await db
    .updateTable('users')
    .set({ suspended })
    .where('id', '=', id)
    .where('role', 'in', ['student', 'teacher'])
    .returning(selectCols)
    .executeTakeFirst();
  if (!row) throw notFound('student or teacher not found');
  if (suspended) await revokeAllSessions(redis, id);
  return toDTO(row);
}

export async function findOrCreateOAuthUser(
  db: Kysely<Database>,
  provider: string,
  profile: { subject: string; email: string; name: string }
): Promise<UserDTO> {
  const existing = await db
    .selectFrom('users')
    .select(selectCols)
    .where('oauth_provider', '=', provider)
    .where('oauth_subject', '=', profile.subject)
    .executeTakeFirst();
  if (existing) return toDTO(existing);

  const byEmail = await db
    .selectFrom('users')
    .select([...selectCols])
    .where('email', '=', profile.email)
    .executeTakeFirst();
  if (byEmail) {
    const linked = await db
      .updateTable('users')
      .set({ oauth_provider: provider, oauth_subject: profile.subject })
      .where('id', '=', byEmail.id)
      .returning(selectCols)
      .executeTakeFirstOrThrow();
    return toDTO(linked);
  }

  const created = await db
    .insertInto('users')
    .values({
      email: profile.email,
      name: profile.name,
      role: 'student',
      oauth_provider: provider,
      oauth_subject: profile.subject,
    })
    .returning(selectCols)
    .executeTakeFirstOrThrow();
  return toDTO(created);
}
