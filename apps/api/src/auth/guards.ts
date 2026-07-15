import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '@concentrate/shared';
import { forbidden, unauthorized } from '../services/errors.js';
import { getUserById } from '../services/users.js';
import { verifyAccess } from './tokens.js';
import { ACCESS_COOKIE } from './cookies.js';

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = request.cookies[ACCESS_COOKIE];
  if (token === undefined) throw unauthorized();

  let sub: string;
  try {
    sub = verifyAccess(token).sub;
  } catch {
    throw unauthorized('invalid token');
  }

  const user = await getUserById(request.server.db, sub);
  if (!user || user.suspended) throw unauthorized();
  request.user = { id: user.id, role: user.role };
}

export function authorize(...roles: Role[]): preHandlerHookHandler {
  return async function (request: FastifyRequest): Promise<void> {
    if (!request.user) throw unauthorized();
    if (!roles.includes(request.user.role)) throw forbidden();
  };
}
