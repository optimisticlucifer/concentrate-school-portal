import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import type { Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import type { Database } from './db/types.js';
import { db as defaultDb } from './db/kysely.js';
import { redis as defaultRedis } from './redis.js';
import { AppError } from './services/errors.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import statsRoutes from './routes/stats.js';
import chatRoutes from './routes/chat.js';

export interface BuildOptions {
  db?: Kysely<Database>;
  redis?: Redis;
  logger?: boolean;
}

export async function buildServer(
  opts: BuildOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? process.env.NODE_ENV === 'production',
  });

  app.decorate('db', opts.db ?? defaultDb);
  app.decorate('redis', opts.redis ?? defaultRedis);

  await app.register(cookie);
  await app.register(cors, { origin: true, credentials: true });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError)
      return reply.code(err.statusCode).send({ error: err.message });
    if (err instanceof ZodError)
      return reply
        .code(400)
        .send({ error: 'validation failed', details: err.flatten() });
    request.log.error(err);
    return reply.code(500).send({ error: 'internal server error' });
  });

  app.get('/api/health', () => ({ ok: true }));
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(teacherRoutes, { prefix: '/api/teacher' });
  await app.register(studentRoutes, { prefix: '/api/student' });
  await app.register(statsRoutes, { prefix: '/api/v0/stats' });
  await app.register(chatRoutes, { prefix: '/api' });

  return app;
}
