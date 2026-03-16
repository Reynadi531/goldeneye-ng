import { env } from "@goldeneye-ng/env/server";
import Redis from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redis.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });

    return redis;
  } catch (err) {
    console.error("[Redis] Failed to initialize:", err);
    return null;
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.error(`[Redis] Get error for key ${key}:`, err);
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.set(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[Redis] Set error for key ${key}:`, err);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (err) {
      console.error(`[Redis] Del error for key ${key}:`, err);
      return false;
    }
  },
};
