import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeTestRedis } from '../test/db.js';
import {
  createSession,
  deleteSession,
  isSessionValid,
  revokeAllSessions,
} from './session.js';

const redis = makeTestRedis();

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

describe('session', () => {
  it('createSession makes the session valid and sets a TTL', async () => {
    await createSession(redis, 'user-1', 'jti-1', 60);

    expect(await isSessionValid(redis, 'jti-1')).toBe(true);

    const ttl = await redis.ttl('session:jti-1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);

    // jti tracked under the user's session set
    expect(await redis.smembers('user_sessions:user-1')).toEqual(['jti-1']);
  });

  it('isSessionValid is false for an unknown jti', async () => {
    expect(await isSessionValid(redis, 'nope')).toBe(false);
  });

  it('deleteSession makes the session invalid and drops it from the user set', async () => {
    await createSession(redis, 'user-1', 'jti-1', 60);
    await createSession(redis, 'user-1', 'jti-2', 60);

    await deleteSession(redis, 'user-1', 'jti-1');

    expect(await isSessionValid(redis, 'jti-1')).toBe(false);
    expect(await isSessionValid(redis, 'jti-2')).toBe(true);
    expect(await redis.smembers('user_sessions:user-1')).toEqual(['jti-2']);
  });

  it('revokeAllSessions removes every jti for a user', async () => {
    await createSession(redis, 'user-1', 'jti-1', 60);
    await createSession(redis, 'user-1', 'jti-2', 60);
    await createSession(redis, 'user-2', 'other', 60);

    await revokeAllSessions(redis, 'user-1');

    expect(await isSessionValid(redis, 'jti-1')).toBe(false);
    expect(await isSessionValid(redis, 'jti-2')).toBe(false);
    expect(await redis.exists('user_sessions:user-1')).toBe(0);

    // untouched other user
    expect(await isSessionValid(redis, 'other')).toBe(true);
  });

  it('revokeAllSessions is a no-op when the user has no sessions', async () => {
    await expect(revokeAllSessions(redis, 'ghost')).resolves.toBeUndefined();
    expect(await redis.exists('user_sessions:ghost')).toBe(0);
  });
});
