import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const redisUrl =
  process.env.BULLMQ_REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = "demo-tasks";

const queue = new Queue(QUEUE_NAME, { connection });

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const steps = [
      { name: "validate", status: "pending" as const },
      { name: "process", status: "pending" as const },
      { name: "finalize", status: "pending" as const },
    ];

    for (let i = 0; i < steps.length; i++) {
      steps[i]!.status = "active";
      await job.updateProgress({
        currentStep: steps[i]!.name,
        percent: Math.round(((i + 1) / steps.length) * 100),
        steps: steps.map((s, idx) => ({
          ...s,
          status:
            idx < i ? "completed" : idx === i ? "active" : ("pending" as const),
        })),
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

async function seed() {
  for (let i = 0; i < 5; i++) {
    await queue.add("process-item", { index: i });
  }
  console.log("Seeded 5 demo jobs");
}

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log("Demo worker running on queue:", QUEUE_NAME);
void seed();
