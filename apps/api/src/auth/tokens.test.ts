import { describe, expect, it } from 'vitest';
import {
  signAccess,
  verifyAccess,
  signRefresh,
  verifyRefresh,
} from './tokens.js';

describe('access tokens', () => {
  it('round-trips sub + role', () => {
    const token = signAccess('user-123', 'teacher');
    const claims = verifyAccess(token);
    expect(claims.sub).toBe('user-123');
    expect(claims.role).toBe('teacher');
  });

  it('throws on garbage', () => {
    expect(() => verifyAccess('not-a-jwt')).toThrow();
  });

  it('rejects a refresh token (missing role)', () => {
    const { token } = signRefresh('user-123');
    expect(() => verifyAccess(token)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('round-trips sub + jti', () => {
    const { token, jti } = signRefresh('user-456');
    const claims = verifyRefresh(token);
    expect(claims.sub).toBe('user-456');
    expect(claims.jti).toBe(jti);
  });

  it('returns a unique jti each call', () => {
    const a = signRefresh('user-456');
    const b = signRefresh('user-456');
    expect(a.jti).not.toBe(b.jti);
  });

  it('throws on garbage', () => {
    expect(() => verifyRefresh('not-a-jwt')).toThrow();
  });
});
