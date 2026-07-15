import type { FastifyInstance } from 'fastify';
import { chatSchema } from '@concentrate/shared';
import { authenticate } from '../auth/guards.js';
import { chat } from '../services/chat.js';

export default async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/chat',
    { preHandler: authenticate },
    async (request) => {
      const { message } = chatSchema.parse(request.body);
      return chat(app.db, request.user!.id, request.user!.role, message);
    }
  );
}
