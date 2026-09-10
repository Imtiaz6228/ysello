import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[redis] REDIS_URL not set — Redis features disabled in development.",
      );
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
    tls: url.startsWith("rediss://")
      ? { rejectUnauthorized: false }
      : undefined,
    lazyConnect: false,
  });

  client.on("error", (error: Error) => {
    console.error("[redis] connection error:", error.message);
  });

  client.on("connect", () => {
    console.log("[redis] connected");
  });

  return client;
}

export const redis: Redis | null = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export async function redisPing(): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export async function publish(channel: string, message: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.publish(channel, message);
  } catch (error) {
    console.error(`[redis] publish to ${channel} failed:`, error);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error(`[redis] cache set ${key} failed:`, error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}
