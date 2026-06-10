import { Redis, type Redis as RedisType } from "ioredis";

export type RedisConnectionConfig = {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
};

export function createRedisConnection(config: RedisConnectionConfig): RedisType {
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

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
