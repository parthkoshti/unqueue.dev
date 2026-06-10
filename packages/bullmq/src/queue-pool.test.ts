import { describe, expect, it, vi } from "vitest";
import { QueuePool } from "./queue-pool.js";

describe("QueuePool", () => {
  it("reuses queue instances for the same key", () => {
    const pool = new QueuePool();
    const connection = {} as never;

    const first = pool.getQueue("redis-1", connection, "emails", "bull");
    const second = pool.getQueue("redis-1", connection, "emails", "bull");

    expect(first).toBe(second);
  });

  it("closes queues for an instance", async () => {
    const pool = new QueuePool();
    const connection = {} as never;

    const queue = pool.getQueue("redis-1", connection, "emails", "bull");
    queue.close = vi.fn().mockResolvedValue(undefined);

    await pool.closeForInstance("redis-1");

    expect(queue.close).toHaveBeenCalledOnce();
    const again = pool.getQueue("redis-1", connection, "emails", "bull");
    expect(again).not.toBe(queue);
  });
});
