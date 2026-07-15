import type { FastifyReply } from 'fastify';
import { config } from '../config.js';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from './tokens.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// Secure cookies require HTTPS; drive the flag off the public URL scheme so it is
// correct whether the deployment terminates TLS or not.
const base = {
  httpOnly: true,
  secure: config.appUrl.startsWith('https'),
  sameSite: 'lax',
  path: '/',
} as const;

export function setAuthCookies(
  reply: FastifyReply,
  access: string,
  refresh: string
): void {
  reply.setCookie(ACCESS_COOKIE, access, {
    ...base,
    maxAge: ACCESS_TTL_SECONDS,
  });
  reply.setCookie(REFRESH_COOKIE, refresh, {
    ...base,
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export function setAccessCookie(reply: FastifyReply, access: string): void {
  reply.setCookie(ACCESS_COOKIE, access, {
    ...base,
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, { path: '/' });
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
}
