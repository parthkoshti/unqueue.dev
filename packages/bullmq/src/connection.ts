import { createRedisConnection, type RedisConnectionConfig } from "@unstall/redis";
import type { RedisConnection } from "./redis-types.js";
import type { RedisInstanceConfig } from "./types.js";

export class ConnectionPool {
  private connections = new Map<string, RedisConnection>();

  getConnection(config: RedisInstanceConfig): RedisConnection {
    let conn = this.connections.get(config.id);
    if (!conn) {
      conn = createRedisConnection({
        host: config.host,
        port: config.port,
        password: config.password,
        tls: config.tls,
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
    password: instance.password,
    tls: instance.tls,
  };
}
