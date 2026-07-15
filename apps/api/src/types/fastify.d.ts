import '@fastify/cookie';
import type { Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import type { Role } from '@concentrate/shared';
import type { Database } from '../db/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>;
    redis: Redis;
  }
  interface FastifyRequest {
    user?: { id: string; role: Role };
  }
}
