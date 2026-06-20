import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import type { Logger } from "@unqueue/logger";

const QUEUE_NAME = "demo-tasks";

export function startDemoWorker(redisUrl: string, logger: Logger): void {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const seederConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const queue = new Queue(QUEUE_NAME, { connection: seederConnection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const steps: { name: string; status: "pending" | "active" | "completed" }[] = [
        { name: "validate", status: "pending" },
        { name: "process", status: "pending" },
        { name: "finalize", status: "pending" },
      ];

      for (let i = 0; i < steps.length; i++) {
        steps[i]!.status = "active";
        await job.updateProgress({
          currentStep: steps[i]!.name,
          percent: Math.round(((i + 1) / steps.length) * 100),
          steps: steps.map((s, idx) => ({
            ...s,
            status: idx < i ? "completed" : idx === i ? "active" : "pending",
          })) as { name: string; status: "pending" | "active" | "completed" }[],
        });

        await job.log(
          JSON.stringify({
            v: 1,
            ts: Date.now(),
            level: "info",
            message: `Running step: ${steps[i]!.name}`,
            metadata: { jobId: job.id, step: steps[i]!.name },
          }),
        );

        await new Promise((r) => setTimeout(r, 1000));
        steps[i]!.status = "completed";
      }

      await job.log(
        JSON.stringify({
          v: 1,
          ts: Date.now(),
          level: "info",
          message: "Job completed successfully",
        }),
      );

      return { ok: true };
    },
    { connection, concurrency: 2 },
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Demo job completed");
  });

  worker.on("failed", (job, err) => {
    logger.warn({ jobId: job?.id, err }, "Demo job failed");
  });

  void queue.add("process-item", { index: 0 }).then(async () => {
    for (let i = 1; i < 5; i++) {
      await queue.add("process-item", { index: i });
    }
    logger.info({ queue: QUEUE_NAME }, "Seeded demo jobs");
  });

  logger.info({ queue: QUEUE_NAME }, "Demo worker started");
}
