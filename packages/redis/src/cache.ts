import { Redis } from "ioredis";

export type DiscoveryCache = {
  get(redisInstanceId: string): Promise<string[] | null>;
  set(redisInstanceId: string, queueNames: string[], ttlSec: number): Promise<void>;
  invalidate(redisInstanceId: string): Promise<void>;
};

const DISCOVERY_KEY_PREFIX = "unstall:discovery:";
export const DISCOVERY_CACHE_TTL_SEC = 604_800; // 7 days

function discoveryKey(redisInstanceId: string): string {
  return `${DISCOVERY_KEY_PREFIX}${redisInstanceId}`;
}

type MemoryEntry = {
  queueNames: string[];
  expiresAt: number;
};

export function createInMemoryDiscoveryCache(): DiscoveryCache {
  const store = new Map<string, MemoryEntry>();

  return {
    async get(redisInstanceId) {
      const entry = store.get(redisInstanceId);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(redisInstanceId);
        return null;
      }
      return entry.queueNames;
    },

    async set(redisInstanceId, queueNames, ttlSec) {
      store.set(redisInstanceId, {
        queueNames,
        expiresAt: Date.now() + ttlSec * 1000,
      });
    },

    async invalidate(redisInstanceId) {
      store.delete(redisInstanceId);
    },
  };
}

export function createRedisDiscoveryCache(redisUrl: string): DiscoveryCache {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  void redis.connect().catch(() => {
    // Connection errors surface on first command.
  });

  return {
    async get(redisInstanceId) {
      try {
        const raw = await redis.get(discoveryKey(redisInstanceId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((name): name is string => typeof name === "string");
      } catch {
        return null;
      }
    },

    async set(redisInstanceId, queueNames, ttlSec) {
      try {
        await redis.set(
          discoveryKey(redisInstanceId),
          JSON.stringify(queueNames),
          "EX",
          ttlSec,
        );
      } catch {
        // Best-effort cache write.
      }
    },

    async invalidate(redisInstanceId) {
      try {
        await redis.del(discoveryKey(redisInstanceId));
      } catch {
        // Best-effort cache invalidation.
      }
    },
  };
}

export function createDiscoveryCache(redisUrl?: string): DiscoveryCache {
  if (redisUrl) {
    return createRedisDiscoveryCache(redisUrl);
  }
  return createInMemoryDiscoveryCache();
}
