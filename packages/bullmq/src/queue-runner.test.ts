import { describe, expect, it, vi } from "vitest";

const { close, Queue } = vi.hoisted(() => {
  const close = vi.fn().mockResolvedValue(undefined);
  const Queue = vi.fn().mockImplementation(() => ({ close }));
  return { close, Queue };
});

vi.mock("bullmq", () => ({ Queue }));

import { withQueue } from "./queue-runner.js";

describe("withQueue", () => {
  it("closes the queue after the callback completes", async () => {
    const connection = {} as never;
    close.mockClear();
    Queue.mockClear();

    await withQueue(connection, "my-queue", "bull", async () => "done");

    expect(Queue).toHaveBeenCalledWith("my-queue", {
      connection,
      prefix: "bull",
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes the queue when the callback throws", async () => {
    const connection = {} as never;
    close.mockClear();

    await expect(
      withQueue(connection, "my-queue", "bull", async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");

    expect(close).toHaveBeenCalledTimes(1);
  });
});
