import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Kysely } from 'kysely';
import { hashPassword } from '../auth/password.js';
import { db as defaultDb, pool } from './kysely.js';
import { migrateToLatest } from './migrate.js';
import type { Database } from './types.js';

const FIRST = [
  'Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Isla', 'Kai', 'Nora', 'Leo',
  'Maya', 'Owen', 'Ruby', 'Finn', 'Elle', 'Jude', 'Iris', 'Cole', 'Luna', 'Reed',
  'Sage', 'Theo', 'Wren', 'Milo', 'Faye', 'Rhys', 'Vera', 'Beau', 'Cleo', 'Dane',
];

const daysFromNow = (d: number): string =>
  new Date(Date.now() + d * 86400000).toISOString();

export async function seed(db: Kysely<Database>): Promise<void> {
  await db.deleteFrom('users').execute();

  const pw = await hashPassword('password123');
  await db
    .insertInto('users')
    .values({ email: 'admin@concentrate.test', name: 'Admin User', role: 'admin', password_hash: pw })
    .execute();

  const teacher = await db
    .insertInto('users')
    .values({ email: 'teacher@concentrate.test', name: 'Grace Hopper', role: 'teacher', password_hash: pw })
    .returning('id')
    .executeTakeFirstOrThrow();

  const students = await db
    .insertInto('users')
    .values(
      FIRST.map((n, i) => ({
        email: `student${i + 1}@concentrate.test`,
        name: `${n} ${['Ray', 'Cho', 'Diaz', 'Kim', 'Osei'][i % 5]}`,
        role: 'student' as const,
        password_hash: pw,
      }))
    )
    .returning('id')
    .execute();

  const primary = students[0]!.id; // student1 logs in for the demo

  const classNames = ['Algebra I', 'World History', 'Intro to Biology'];
  for (const name of classNames) {
    const cls = await db
      .insertInto('classes')
      .values({ name, teacher_id: teacher.id })
      .returning('id')
      .executeTakeFirstOrThrow();

    // enrol ~20 students + always student1
    const enrolled = students.slice(0, 20);
    if (!enrolled.some((s) => s.id === primary))
      enrolled.push(students[0]!);
    await db
      .insertInto('enrollments')
      .values(enrolled.map((s) => ({ class_id: cls.id, student_id: s.id })))
      .execute();

    const assignments = await db
      .insertInto('assignments')
      .values([
        { class_id: cls.id, title: `${name}: Warm-up`, description: 'Getting started.', due_at: daysFromNow(-5) },
        { class_id: cls.id, title: `${name}: Midterm`, description: 'Core concepts.', due_at: daysFromNow(2) },
        { class_id: cls.id, title: `${name}: Project`, description: 'Apply what you learned.', due_at: daysFromNow(10) },
      ])
      .returning(['id'])
      .execute();

    // Warm-up: everyone submitted, most graded (mixed states for a real grading UI)
    const warmup = assignments[0]!.id;
    for (let i = 0; i < enrolled.length; i++) {
      const s = enrolled[i]!;
      const sub = await db
        .insertInto('submissions')
        .values({ assignment_id: warmup, student_id: s.id, content: 'My warm-up answer.', status: 'submitted' })
        .returning('id')
        .executeTakeFirstOrThrow();
      if (i % 4 !== 0) {
        await db
          .updateTable('submissions')
          .set({ status: 'graded' })
          .where('id', '=', sub.id)
          .execute();
        await db
          .insertInto('grades')
          .values({ submission_id: sub.id, score: 70 + (i % 6) * 5, feedback: 'Solid work — keep it up.' })
          .execute();
      }
    }
  }

  console.log(
    `seeded: 1 admin, 1 teacher, ${students.length} students, ${classNames.length} classes`
  );
  console.log('login: admin@ / teacher@ / student1@concentrate.test — password123');
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  migrateToLatest(defaultDb)
    .then(() => seed(defaultDb))
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
