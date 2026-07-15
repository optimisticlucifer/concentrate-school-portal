import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@concentrate/shared';
import { config } from '../config.js';

export const ACCESS_TTL_SECONDS = 60 * 60; // 1h
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d

export interface AccessClaims {
  sub: string;
  role: Role;
}
export interface RefreshClaims {
  sub: string;
  jti: string;
}

export function signAccess(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, config.jwtSecret, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function signRefresh(userId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, config.jwtSecret, {
    expiresIn: REFRESH_TTL_SECONDS,
  });
  return { token, jti };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    throw new Error('invalid token payload');
  return value as Record<string, unknown>;
}

export function verifyAccess(token: string): AccessClaims {
  const p = asRecord(jwt.verify(token, config.jwtSecret));
  if (typeof p.sub !== 'string' || typeof p.role !== 'string')
    throw new Error('invalid access token');
  return { sub: p.sub, role: p.role as Role };
}

export function verifyRefresh(token: string): RefreshClaims {
  const p = asRecord(jwt.verify(token, config.jwtSecret));
  if (typeof p.sub !== 'string' || typeof p.jti !== 'string')
    throw new Error('invalid refresh token');
  return { sub: p.sub, jti: p.jti };
}
