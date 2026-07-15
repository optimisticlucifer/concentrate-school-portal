import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { submissionSchema } from '@concentrate/shared';
import { authenticate, authorize } from '../auth/guards.js';
import { listClassesForStudent } from '../services/classes.js';
import {
  listStudentAssignments,
  studentAverage,
} from '../services/student.js';
import { submitAssignment } from '../services/submissions.js';

const idParam = z.object({ id: z.string().uuid() });

export default async function studentRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('student'));

  const me = (request: { user?: { id: string } }): string => request.user!.id;

  app.get('/dashboard', async (request) => ({
    assignments: await listStudentAssignments(app.db, me(request)),
    average: await studentAverage(app.db, me(request)),
    classes: await listClassesForStudent(app.db, me(request)),
  }));

  app.get('/assignments', (request) =>
    listStudentAssignments(app.db, me(request))
  );

  app.get('/classes', (request) =>
    listClassesForStudent(app.db, me(request))
  );

  app.post('/assignments/:id/submit', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    reply.code(201);
    return submitAssignment(
      app.db,
      me(request),
      id,
      submissionSchema.parse(request.body)
    );
  });
}
