import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`.execute(db);

  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('role', 'text', (c) => c.notNull())
    .addColumn('password_hash', 'text')
    .addColumn('oauth_provider', 'text')
    .addColumn('oauth_subject', 'text')
    .addColumn('suspended', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable('teacher_groups')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable('teacher_group_members')
    .addColumn('group_id', 'uuid', (c) =>
      c.notNull().references('teacher_groups.id').onDelete('cascade')
    )
    .addColumn('teacher_id', 'uuid', (c) =>
      c.notNull().references('users.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('teacher_group_members_pk', [
      'group_id',
      'teacher_id',
    ])
    .execute();

  await db.schema
    .createTable('classes')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('teacher_id', 'uuid', (c) =>
      c.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('created_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable('enrollments')
    .addColumn('class_id', 'uuid', (c) =>
      c.notNull().references('classes.id').onDelete('cascade')
    )
    .addColumn('student_id', 'uuid', (c) =>
      c.notNull().references('users.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('enrollments_pk', ['class_id', 'student_id'])
    .execute();

  await db.schema
    .createTable('assignments')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('class_id', 'uuid', (c) =>
      c.notNull().references('classes.id').onDelete('cascade')
    )
    .addColumn('title', 'text', (c) => c.notNull())
    .addColumn('description', 'text', (c) => c.notNull().defaultTo(''))
    .addColumn('due_at', 'timestamptz', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable('submissions')
    .addColumn('id', 'uuid', (c) =>
      c.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('assignment_id', 'uuid', (c) =>
      c.notNull().references('assignments.id').onDelete('cascade')
    )
    .addColumn('student_id', 'uuid', (c) =>
      c.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('content', 'text', (c) => c.notNull())
    .addColumn('submitted_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('submitted'))
    .addUniqueConstraint('submissions_assignment_student_uq', [
      'assignment_id',
      'student_id',
    ])
    .execute();

  await db.schema
    .createTable('grades')
    .addColumn('submission_id', 'uuid', (c) =>
      c.primaryKey().references('submissions.id').onDelete('cascade')
    )
    .addColumn('score', 'real', (c) => c.notNull())
    .addColumn('feedback', 'text', (c) => c.notNull().defaultTo(''))
    .addColumn('graded_at', 'timestamptz', (c) =>
      c.notNull().defaultTo(sql`now()`)
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const t of [
    'grades',
    'submissions',
    'assignments',
    'enrollments',
    'classes',
    'teacher_group_members',
    'teacher_groups',
    'users',
  ]) {
    await db.schema.dropTable(t).ifExists().execute();
  }
}
