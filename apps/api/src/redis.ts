import { Redis } from 'ioredis';
import { config } from './config.js';

export function createRedis(url = config.redisUrl): Redis {
  return new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
}

export const redis = createRedis();

export async function cacheGet<T>(
  client: Redis,
  key: string
): Promise<T | null> {
  const raw = await client.get(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

export async function cacheSet(
  client: Redis,
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheInvalidate(
  client: Redis,
  prefix: string
): Promise<void> {
  const keys = await client.keys(`${prefix}*`);
  if (keys.length > 0) await client.del(keys);
}
