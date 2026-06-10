import { Redis, type Redis as RedisType } from "ioredis";

export type RedisConnectionConfig = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
  tlsServername?: string;
};

export type RedisHealthStatus = "connected" | "error" | "disconnected";

export function createRedisConnection(
  config: RedisConnectionConfig,
  options?: {
    onHealthChange?: (status: RedisHealthStatus, error?: string) => void;
  },
): RedisType {
  const redis = new Redis({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.db ?? 0,
    tls: config.tls
      ? { servername: config.tlsServername ?? config.host }
      : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    commandTimeout: 30_000,
    keepAlive: 30_000,
  });

  if (options?.onHealthChange) {
    attachHealthListeners(redis, options.onHealthChange);
  }

  return redis;
}

function attachHealthListeners(
  redis: RedisType,
  onHealthChange: (status: RedisHealthStatus, error?: string) => void,
): void {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pending: { status: RedisHealthStatus; error?: string } | undefined;

  const emit = (status: RedisHealthStatus, error?: string) => {
    pending = { status, error };
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (pending) onHealthChange(pending.status, pending.error);
      pending = undefined;
    }, 2_000);
  };

  redis.on("ready", () => emit("connected"));
  redis.on("error", (err: Error) => emit("error", err.message));
  redis.on("close", () => emit("disconnected"));
  redis.on("end", () => emit("disconnected"));
}

export {
  createDiscoveryCache,
  createInMemoryDiscoveryCache,
  createRedisDiscoveryCache,
  DISCOVERY_CACHE_TTL_SEC,
  type DiscoveryCache,
} from "./cache.js";

export async function testRedisConnection(
  config: RedisConnectionConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const redis = createRedisConnection(config);
  try {
    const pong = await redis.ping();
    if (pong !== "PONG") {
      return { ok: false, error: "Unexpected PING response" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  } finally {
    redis.disconnect();
  }
}
