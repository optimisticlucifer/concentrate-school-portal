import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeTestDb, makeTestRedis, resetDb } from '../test/db.js';
import { seedUser } from '../test/factory.js';
import {
  createUser,
  deleteUser,
  findOrCreateOAuthUser,
  getUserById,
  listStudents,
  updateUser,
} from './users.js';

const db = makeTestDb();
const redis = makeTestRedis();

afterAll(async () => {
  await db.destroy();
  await redis.quit();
});
beforeEach(async () => {
  await resetDb(db);
});

describe('createUser + getUserById', () => {
  it('creates a user and fetches it back by id', async () => {
    const created = await createUser(db, {
      email: 'new@test.local',
      name: 'New User',
      role: 'teacher',
      password: 'password123',
    });
    expect(created.email).toBe('new@test.local');
    expect(created.role).toBe('teacher');
    expect(created.suspended).toBe(false);

    const fetched = await getUserById(db, created.id);
    expect(fetched).toEqual(created);
  });

  it('getUserById returns undefined for a missing id', async () => {
    const fetched = await getUserById(
      db,
      '00000000-0000-0000-0000-000000000000'
    );
    expect(fetched).toBeUndefined();
  });

  it('throws 409 on duplicate email', async () => {
    await createUser(db, {
      email: 'dup@test.local',
      name: 'First',
      role: 'student',
      password: 'password123',
    });
    await expect(
      createUser(db, {
        email: 'dup@test.local',
        name: 'Second',
        role: 'student',
        password: 'password123',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('updateUser', () => {
  it('throws 404 for a missing user', async () => {
    await expect(
      updateUser(db, '00000000-0000-0000-0000-000000000000', {
        name: 'X',
        role: 'student',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteUser', () => {
  it('throws for a missing user', async () => {
    await expect(
      deleteUser(db, '00000000-0000-0000-0000-000000000000')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('listStudents', () => {
  it('returns only non-suspended students', async () => {
    const active = await seedUser(db, {
      role: 'student',
      email: 'active@test.local',
      name: 'Active Student',
    });
    await seedUser(db, {
      role: 'student',
      email: 'suspended@test.local',
      name: 'Suspended Student',
      suspended: true,
    });
    await seedUser(db, { role: 'teacher', email: 'teach@test.local' });
    await seedUser(db, { role: 'admin', email: 'admin@test.local' });

    const students = await listStudents(db);
    expect(students).toHaveLength(1);
    expect(students[0].id).toBe(active.id);
    expect(students[0].email).toBe('active@test.local');
  });
});

describe('findOrCreateOAuthUser', () => {
  it('creates a new user as a student', async () => {
    const user = await findOrCreateOAuthUser(db, 'google', {
      subject: 'sub-123',
      email: 'oauth@test.local',
      name: 'OAuth User',
    });
    expect(user.role).toBe('student');
    expect(user.email).toBe('oauth@test.local');
  });

  it('returns the existing user by oauth_subject', async () => {
    const first = await findOrCreateOAuthUser(db, 'google', {
      subject: 'sub-456',
      email: 'oauth2@test.local',
      name: 'OAuth Two',
    });
    const again = await findOrCreateOAuthUser(db, 'google', {
      subject: 'sub-456',
      email: 'different@test.local',
      name: 'Changed Name',
    });
    expect(again.id).toBe(first.id);
    expect(again.email).toBe('oauth2@test.local');
  });

  it('links to an existing user by matching email', async () => {
    const seeded = await seedUser(db, {
      role: 'teacher',
      email: 'link@test.local',
      name: 'Linkable',
    });
    const linked = await findOrCreateOAuthUser(db, 'google', {
      subject: 'sub-789',
      email: 'link@test.local',
      name: 'From OAuth',
    });
    expect(linked.id).toBe(seeded.id);
    expect(linked.role).toBe('teacher');

    // subsequent lookup by the linked subject returns the same user
    const bySubject = await findOrCreateOAuthUser(db, 'google', {
      subject: 'sub-789',
      email: 'whatever@test.local',
      name: 'Whatever',
    });
    expect(bySubject.id).toBe(seeded.id);
  });
});
