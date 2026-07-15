import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeTestRedis } from './test/db.js';
import { cacheGet, cacheInvalidate, cacheSet } from './redis.js';

const redis = makeTestRedis();

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

describe('redis cache helpers', () => {
  it('cacheSet then cacheGet returns the parsed value', async () => {
    const value = { classId: 'abc', average: 87.5, tags: ['a', 'b'] };
    await cacheSet(redis, 'stats:abc', value, 60);

    const got = await cacheGet<typeof value>(redis, 'stats:abc');
    expect(got).toEqual(value);
  });

  it('cacheSet stores serialized JSON with the given TTL', async () => {
    await cacheSet(redis, 'stats:ttl', { average: 1 }, 60);

    const raw = await redis.get('stats:ttl');
    expect(raw).toBe(JSON.stringify({ average: 1 }));

    const ttl = await redis.ttl('stats:ttl');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('cacheGet returns null for a missing key', async () => {
    const got = await cacheGet(redis, 'stats:does-not-exist');
    expect(got).toBeNull();
  });

  it('cacheInvalidate deletes only keys matching the prefix', async () => {
    await cacheSet(redis, 'stats:1', { average: 1 }, 60);
    await cacheSet(redis, 'stats:2', { average: 2 }, 60);
    await cacheSet(redis, 'other:1', { average: 3 }, 60);

    await cacheInvalidate(redis, 'stats:');

    expect(await cacheGet(redis, 'stats:1')).toBeNull();
    expect(await cacheGet(redis, 'stats:2')).toBeNull();
    expect(await cacheGet(redis, 'other:1')).toEqual({ average: 3 });
  });

  it('cacheInvalidate is a no-op when no keys match the prefix', async () => {
    await cacheSet(redis, 'other:1', { average: 3 }, 60);

    await expect(cacheInvalidate(redis, 'stats:')).resolves.toBeUndefined();
    expect(await cacheGet(redis, 'other:1')).toEqual({ average: 3 });
  });
});
