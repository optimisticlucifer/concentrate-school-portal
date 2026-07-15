import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  assignmentSchema,
  classSchema,
  enrollmentSchema,
  gradeSchema,
} from '@concentrate/shared';
import { authenticate, authorize } from '../auth/guards.js';
import {
  assertClassOwner,
  createClass,
  deleteClass,
  enrollStudent,
  listClassesForTeacher,
  listStudentsInClass,
  removeStudent,
  updateClass,
} from '../services/classes.js';
import {
  createAssignment,
  deleteAssignment,
  listAssignmentsForClass,
} from '../services/assignments.js';
import {
  countPendingForTeacher,
  listSubmissionsForAssignment,
} from '../services/submissions.js';
import { gradeSubmission } from '../services/grades.js';
import { listStudents } from '../services/users.js';

const classParam = z.object({ id: z.string().uuid() });
const nested = z.object({ id: z.string().uuid(), aid: z.string().uuid() });

export default async function teacherRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('teacher'));

  const me = (request: { user?: { id: string } }): string => request.user!.id;

  app.get('/dashboard', async (request) => ({
    classes: await listClassesForTeacher(app.db, me(request)),
    pending: await countPendingForTeacher(app.db, me(request)),
  }));

  app.get('/students', () => listStudents(app.db));

  app.get('/classes', (request) => listClassesForTeacher(app.db, me(request)));
  app.post('/classes', async (request, reply) => {
    reply.code(201);
    return createClass(app.db, me(request), classSchema.parse(request.body));
  });
  app.put('/classes/:id', (request) => {
    const { id } = classParam.parse(request.params);
    return updateClass(app.db, me(request), id, classSchema.parse(request.body));
  });
  app.delete('/classes/:id', async (request) => {
    const { id } = classParam.parse(request.params);
    await deleteClass(app.db, me(request), id);
    return { ok: true };
  });

  app.get('/classes/:id/students', async (request) => {
    const { id } = classParam.parse(request.params);
    await assertClassOwner(app.db, me(request), id);
    return listStudentsInClass(app.db, id);
  });
  app.post('/classes/:id/students', async (request, reply) => {
    const { id } = classParam.parse(request.params);
    const { studentId } = enrollmentSchema.parse(request.body);
    await enrollStudent(app.db, me(request), id, studentId);
    reply.code(201);
    return { ok: true };
  });
  app.delete('/classes/:id/students/:aid', async (request) => {
    const { id, aid } = nested.parse(request.params);
    await removeStudent(app.db, me(request), id, aid);
    return { ok: true };
  });

  app.get('/classes/:id/assignments', async (request) => {
    const { id } = classParam.parse(request.params);
    await assertClassOwner(app.db, me(request), id);
    return listAssignmentsForClass(app.db, id);
  });
  app.post('/classes/:id/assignments', async (request, reply) => {
    const { id } = classParam.parse(request.params);
    reply.code(201);
    return createAssignment(
      app.db,
      me(request),
      id,
      assignmentSchema.parse(request.body)
    );
  });
  app.delete('/classes/:id/assignments/:aid', async (request) => {
    const { id, aid } = nested.parse(request.params);
    await deleteAssignment(app.db, me(request), id, aid);
    return { ok: true };
  });

  app.get('/classes/:id/assignments/:aid/submissions', async (request) => {
    const { id, aid } = nested.parse(request.params);
    return listSubmissionsForAssignment(app.db, me(request), id, aid);
  });

  app.post('/submissions/:id/grade', (request) => {
    const { id } = classParam.parse(request.params);
    return gradeSubmission(
      app.db,
      app.redis,
      me(request),
      id,
      gradeSchema.parse(request.body)
    );
  });
}
