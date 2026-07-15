import type { Redis } from 'ioredis';

const sessionKey = (jti: string): string => `session:${jti}`;
const userKey = (userId: string): string => `user_sessions:${userId}`;

export async function createSession(
  redis: Redis,
  userId: string,
  jti: string,
  ttlSeconds: number
): Promise<void> {
  await redis
    .multi()
    .set(sessionKey(jti), userId, 'EX', ttlSeconds)
    .sadd(userKey(userId), jti)
    .expire(userKey(userId), ttlSeconds)
    .exec();
}

export async function isSessionValid(
  redis: Redis,
  jti: string
): Promise<boolean> {
  return (await redis.exists(sessionKey(jti))) === 1;
}

export async function deleteSession(
  redis: Redis,
  userId: string,
  jti: string
): Promise<void> {
  await redis.del(sessionKey(jti));
  await redis.srem(userKey(userId), jti);
}

export async function revokeAllSessions(
  redis: Redis,
  userId: string
): Promise<void> {
  const jtis = await redis.smembers(userKey(userId));
  const keys = jtis.map(sessionKey);
  if (keys.length > 0) await redis.del(...keys);
  await redis.del(userKey(userId));
}
