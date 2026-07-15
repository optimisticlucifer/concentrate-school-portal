import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@concentrate/shared';
import { config, isGoogleConfigured } from '../config.js';
import { verifyPassword } from '../auth/password.js';
import { signAccess, signRefresh, verifyRefresh, REFRESH_TTL_SECONDS } from '../auth/tokens.js';
import { createSession, deleteSession, isSessionValid } from '../auth/session.js';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAccessCookie,
  setAuthCookies,
} from '../auth/cookies.js';
import { exchangeGoogleCode, googleAuthUrl } from '../auth/google.js';
import { authenticate } from '../auth/guards.js';
import { getCredentialsByEmail, getUserById, findOrCreateOAuthUser } from '../services/users.js';
import { badRequest, unauthorized } from '../services/errors.js';

const OAUTH_STATE_COOKIE = 'oauth_state';

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const creds = await getCredentialsByEmail(app.db, email);
    if (!creds || creds.passwordHash === null)
      throw unauthorized('invalid credentials');
    if (!(await verifyPassword(password, creds.passwordHash)))
      throw unauthorized('invalid credentials');
    if (creds.suspended) throw unauthorized('account suspended');

    const access = signAccess(creds.id, creds.role);
    const { token: refresh, jti } = signRefresh(creds.id);
    await createSession(app.redis, creds.id, jti, REFRESH_TTL_SECONDS);
    setAuthCookies(reply, access, refresh);
    return getUserById(app.db, creds.id);
  });

  app.post('/logout', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (token !== undefined) {
      try {
        const { sub, jti } = verifyRefresh(token);
        await deleteSession(app.redis, sub, jti);
      } catch {
        // token already invalid — clearing cookies is enough
      }
    }
    clearAuthCookies(reply);
    return { ok: true };
  });

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (token === undefined) throw unauthorized();
    let claims;
    try {
      claims = verifyRefresh(token);
    } catch {
      throw unauthorized('invalid refresh token');
    }
    if (!(await isSessionValid(app.redis, claims.jti)))
      throw unauthorized('session expired');
    const user = await getUserById(app.db, claims.sub);
    if (!user || user.suspended) throw unauthorized();
    setAccessCookie(reply, signAccess(user.id, user.role));
    return { ok: true };
  });

  app.get('/me', { preHandler: authenticate }, async (request) => {
    return getUserById(app.db, request.user!.id);
  });

  app.get('/google', async (_request, reply) => {
    if (!isGoogleConfigured()) throw badRequest('google oauth not configured');
    const state = randomUUID();
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return reply.redirect(googleAuthUrl(state));
  });

  app.get('/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    const savedState = request.cookies[OAUTH_STATE_COOKIE];
    if (
      !query.code ||
      !query.state ||
      savedState === undefined ||
      query.state !== savedState
    )
      throw badRequest('invalid oauth callback');

    const profile = await exchangeGoogleCode(query.code);
    const user = await findOrCreateOAuthUser(app.db, 'google', profile);
    if (user.suspended) throw unauthorized('account suspended');

    const access = signAccess(user.id, user.role);
    const { token: refresh, jti } = signRefresh(user.id);
    await createSession(app.redis, user.id, jti, REFRESH_TTL_SECONDS);
    setAuthCookies(reply, access, refresh);
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    return reply.redirect(config.appUrl);
  });
}
