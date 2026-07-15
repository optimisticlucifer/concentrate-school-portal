import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createUserSchema,
  teacherGroupSchema,
  updateUserSchema,
} from '@concentrate/shared';
import { authenticate, authorize } from '../auth/guards.js';
import {
  createGroup,
  deleteGroup,
  listGroups,
  updateGroup,
} from '../services/groups.js';
import {
  createUser,
  deleteUser,
  listUsers,
  setSuspended,
  updateUser,
} from '../services/users.js';

const idParam = z.object({ id: z.string().uuid() });
const suspensionBody = z.object({ suspended: z.boolean() });

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('admin'));

  app.get('/groups', () => listGroups(app.db));
  app.post('/groups', async (request, reply) => {
    reply.code(201);
    return createGroup(app.db, teacherGroupSchema.parse(request.body));
  });
  app.put('/groups/:id', (request) => {
    const { id } = idParam.parse(request.params);
    return updateGroup(app.db, id, teacherGroupSchema.parse(request.body));
  });
  app.delete('/groups/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteGroup(app.db, id);
    return { ok: true };
  });

  app.get('/users', () => listUsers(app.db));
  app.post('/users', async (request, reply) => {
    reply.code(201);
    return createUser(app.db, createUserSchema.parse(request.body));
  });
  app.put('/users/:id', (request) => {
    const { id } = idParam.parse(request.params);
    return updateUser(app.db, id, updateUserSchema.parse(request.body));
  });
  app.delete('/users/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteUser(app.db, id);
    return { ok: true };
  });
  app.patch('/users/:id/suspension', (request) => {
    const { id } = idParam.parse(request.params);
    const { suspended } = suspensionBody.parse(request.body);
    return setSuspended(app.db, app.redis, id, suspended);
  });
}
