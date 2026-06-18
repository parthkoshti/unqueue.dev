import { describe, expect, it, vi } from "vitest";
import { listJobs } from "./queue-service.js";

vi.mock("./queue-runner.js", () => ({
  withQueue: vi.fn(
    async (
      _connection: unknown,
      _queueName: string,
      _prefix: string,
      fn: (queue: {
        getJobs: (
          states: string[],
          start: number,
          end: number,
          asc: boolean,
        ) => Promise<Array<{ id: string; name: string; timestamp: number; getState?: () => Promise<string> }>>;
        getJobLogs: (jobId: string) => Promise<{ logs: string[] }>;
      }) => Promise<unknown>,
    ) => {
      const job = {
        id: "job-1",
        name: "send-email",
        timestamp: 1,
        attemptsMade: 0,
        data: { recipient: "user@example.com" },
        progress: { percent: 50 },
        opts: {},
        getState: vi.fn().mockResolvedValue("waiting"),
      };
      return fn({
        getJobs: vi.fn().mockResolvedValue([job]),
        getJobLogs: vi.fn().mockResolvedValue({ logs: ["sent"] }),
      });
    },
  ),
}));

describe("listJobs", () => {
  it("skips per-job getState when listing a known state", async () => {
    const jobs = await listJobs({} as never, "emails", "bull", "waiting");

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.state).toBe("waiting");
    expect(jobs[0]?.payload).toEqual({ recipient: "user@example.com" });
    expect(jobs[0]?.progress).toEqual({ percent: 50 });
    expect(jobs[0]?.logs).toEqual([{ format: "raw", raw: "sent" }]);
  });
});
