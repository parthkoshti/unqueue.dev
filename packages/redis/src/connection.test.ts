import { describe, expect, it, vi } from "vitest";

const { instances } = vi.hoisted(() => ({
  instances: [] as Array<Record<string, unknown>>,
}));

vi.mock("ioredis", () => ({
  Redis: vi.fn(function Redis(this: Record<string, unknown>, opts) {
    instances.push(opts);
    this.on = vi.fn();
    this.disconnect = vi.fn();
    return this;
  }),
}));

import { createRedisConnection } from "./index.js";

describe("createRedisConnection", () => {
  it("passes username, db, tls SNI, and timeouts to ioredis", () => {
    instances.length = 0;

    createRedisConnection({
      host: "redis.example.com",
      port: 6380,
      username: "unstall",
      password: "secret",
      db: 2,
      tls: true,
      tlsServername: "custom.redis.example.com",
    });

    expect(instances[0]).toMatchObject({
      host: "redis.example.com",
      port: 6380,
      username: "unstall",
      password: "secret",
      db: 2,
      tls: { servername: "custom.redis.example.com" },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10_000,
      commandTimeout: 30_000,
      keepAlive: 30_000,
    });
  });

  it("defaults tls servername to host when not provided", () => {
    instances.length = 0;

    createRedisConnection({
      host: "redis.example.com",
      port: 6379,
      tls: true,
    });

    expect(instances[0]?.tls).toEqual({ servername: "redis.example.com" });
  });
});
