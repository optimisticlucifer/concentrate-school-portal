import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Role } from '@concentrate/shared';
import type { Database } from '../db/types.js';
import { hashPassword } from '../auth/password.js';

let counter = 0;

export async function seedUser(
  db: Kysely<Database>,
  opts: {
    role: Role;
    email?: string;
    name?: string;
    password?: string | null;
    suspended?: boolean;
  }
): Promise<{ id: string; email: string; password: string }> {
  counter += 1;
  const email = opts.email ?? `user${counter}@test.local`;
  const password = opts.password === undefined ? 'password123' : opts.password;
  const row = await db
    .insertInto('users')
    .values({
      email,
      name: opts.name ?? `User ${counter}`,
      role: opts.role,
      password_hash: password === null ? null : await hashPassword(password),
      suspended: opts.suspended ?? false,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { id: row.id, email, password: password ?? '' };
}

export async function login(
  app: FastifyInstance,
  email: string,
  password = 'password123'
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app.server);
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
}
