import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, authorize } from '../auth/guards.js';
import {
  averageGrades,
  averageGradesForClass,
  listAllClasses,
  studentNames,
  studentsInClass,
  teacherNames,
} from '../services/stats.js';

const idParam = z.object({ id: z.string().uuid() });

export default async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('admin', 'teacher'));

  app.get('/average-grades', () => averageGrades(app.db, app.redis));
  app.get('/average-grades/:id', (request) => {
    const { id } = idParam.parse(request.params);
    return averageGradesForClass(app.db, app.redis, id);
  });
  app.get('/teacher-names', () => teacherNames(app.db, app.redis));
  app.get('/student-names', () => studentNames(app.db, app.redis));
  app.get('/classes', () => listAllClasses(app.db, app.redis));
  app.get('/classes/:id', (request) => {
    const { id } = idParam.parse(request.params);
    return studentsInClass(app.db, app.redis, id);
  });
}
