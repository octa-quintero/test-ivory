import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true, // don't connect until first command
  enableOfflineQueue: false, // fail immediately when Redis is unavailable
  maxRetriesPerRequest: 0,
});

// Suppress unhandled error events — each operation handles its own errors
redis.on('error', (_err: Error) => {});

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis unavailable — serve uncached, don't crash
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    // KEYS is O(N) — acceptable for a small dataset; use SCAN in production
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(keys[0], ...keys.slice(1));
  } catch {
    // Redis unavailable — skip invalidation
  }
}
