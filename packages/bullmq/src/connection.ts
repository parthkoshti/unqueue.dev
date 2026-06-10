import {
  createRedisConnection,
  type RedisConnectionConfig,
  type RedisHealthStatus,
} from "@unqueue/redis";
import type { RedisConnection } from "./redis-types.js";
import type { RedisInstanceConfig } from "./types.js";

export type HealthChangeCallback = (
  redisInstanceId: string,
  status: RedisHealthStatus,
  error?: string,
) => void;

export class ConnectionPool {
  private connections = new Map<string, RedisConnection>();

  constructor(private onHealthChange?: HealthChangeCallback) {}

  getConnection(config: RedisInstanceConfig): RedisConnection {
    let conn = this.connections.get(config.id);
    if (!conn) {
      conn = createRedisConnection(toConnectionConfig(config), {
        onHealthChange: (status, error) => {
          this.onHealthChange?.(config.id, status, error);
        },
      });
      this.connections.set(config.id, conn);
    }
    return conn;
  }

  duplicate(config: RedisInstanceConfig): RedisConnection {
    return this.getConnection(config).duplicate();
  }

  async remove(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      conn.disconnect();
      this.connections.delete(id);
    }
  }

  async closeAll(): Promise<void> {
    for (const [id] of this.connections) {
      await this.remove(id);
    }
  }
}

export function toConnectionConfig(
  instance: RedisInstanceConfig,
): RedisConnectionConfig {
  return {
    host: instance.host,
    port: instance.port,
    username: instance.username,
    password: instance.password,
    db: instance.db,
    tls: instance.tls,
    tlsServername: instance.tlsServername,
  };
}
