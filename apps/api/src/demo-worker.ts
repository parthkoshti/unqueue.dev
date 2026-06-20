import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import type { Logger } from "@unqueue/logger";

const DEMO_WORKER_LOGS_ENABLED = false;
const FAILURE_RATE = 0.0189;

type StepStatus = "pending" | "active" | "completed";

type DemoQueueConfig = {
  name: string;
  jobNames: readonly string[];
  concurrency: number;
  intervalMs: [min: number, max: number];
  durationMs: [min: number, max: number];
  scheduledEveryMs?: number;
  failureRate: number;
  pressureProfile: "interactive" | "business" | "background" | "batch";
};

const DEMO_QUEUES: readonly DemoQueueConfig[] = [
  {
    name: "demo-email-delivery",
    jobNames: ["send-welcome-email", "send-receipt", "send-digest"],
    concurrency: 6,
    intervalMs: [1_200, 4_500],
    durationMs: [600, 2_000],
    scheduledEveryMs: 20_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "business",
  },
  {
    name: "demo-webhook-dispatch",
    jobNames: ["deliver-webhook", "retry-webhook", "sign-payload"],
    concurrency: 10,
    intervalMs: [900, 3_500],
    durationMs: [400, 1_800],
    failureRate: FAILURE_RATE,
    pressureProfile: "interactive",
  },
  {
    name: "demo-image-pipeline",
    jobNames: ["resize-image", "generate-thumbnail", "optimize-asset"],
    concurrency: 3,
    intervalMs: [3_000, 8_000],
    durationMs: [1_500, 4_000],
    scheduledEveryMs: 45_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "business",
  },
  {
    name: "demo-reporting",
    jobNames: ["build-report", "export-csv", "refresh-dashboard"],
    concurrency: 2,
    intervalMs: [4_000, 10_000],
    durationMs: [1_200, 3_800],
    scheduledEveryMs: 30_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "batch",
  },
  {
    name: "demo-billing-events",
    jobNames: ["sync-invoice", "apply-credit", "reconcile-payment"],
    concurrency: 5,
    intervalMs: [2_000, 7_000],
    durationMs: [800, 2_600],
    scheduledEveryMs: 60_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "business",
  },
  {
    name: "demo-search-indexing",
    jobNames: ["index-document", "delete-document", "refresh-alias"],
    concurrency: 7,
    intervalMs: [1_500, 5_000],
    durationMs: [700, 2_400],
    failureRate: FAILURE_RATE,
    pressureProfile: "background",
  },
  {
    name: "demo-notifications",
    jobNames: ["send-push", "send-sms", "fanout-notification"],
    concurrency: 9,
    intervalMs: [1_000, 4_000],
    durationMs: [500, 1_900],
    scheduledEveryMs: 25_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "interactive",
  },
  {
    name: "demo-data-imports",
    jobNames: ["parse-upload", "validate-rows", "commit-import"],
    concurrency: 1,
    intervalMs: [5_000, 12_000],
    durationMs: [1_800, 4_500],
    failureRate: FAILURE_RATE,
    pressureProfile: "batch",
  },
  {
    name: "demo-crm-sync",
    jobNames: ["sync-contact", "sync-company", "sync-deal"],
    concurrency: 4,
    intervalMs: [2_500, 7_500],
    durationMs: [900, 2_800],
    scheduledEveryMs: 40_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "business",
  },
  {
    name: "demo-audit-log",
    jobNames: ["archive-events", "hydrate-event", "ship-event"],
    concurrency: 12,
    intervalMs: [800, 3_000],
    durationMs: [300, 1_200],
    failureRate: FAILURE_RATE,
    pressureProfile: "background",
  },
  {
    name: "demo-cache-warming",
    jobNames: ["warm-route", "prime-query", "refresh-key"],
    concurrency: 8,
    intervalMs: [1_200, 4_500],
    durationMs: [400, 1_500],
    scheduledEveryMs: 15_000,
    failureRate: FAILURE_RATE,
    pressureProfile: "background",
  },
  {
    name: "demo-ai-workflows",
    jobNames: ["embed-document", "summarize-ticket", "classify-message"],
    concurrency: 11,
    intervalMs: [4_000, 9_000],
    durationMs: [1_400, 3_600],
    failureRate: FAILURE_RATE,
    pressureProfile: "batch",
  },
];

const STEP_NAMES = ["validate", "fetch-dependencies", "process", "persist", "notify"] as const;
const NEW_YORK_TIME_ZONE = "America/New_York";
const INITIAL_JOBS_PER_QUEUE = 8;
const DELAYED_JOB_RATE = 0.2;
const MAX_DELAY_MS = 30_000;

let started = false;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNewYorkTimeParts(date = new Date()): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

  return { day, hour };
}

function getWorkHourPressureMultiplier(profile: DemoQueueConfig["pressureProfile"]): number {
  const { day, hour } = getNewYorkTimeParts();
  const isWeekend = day === "Sat" || day === "Sun";

  let baseMultiplier: number;
  if (isWeekend) {
    baseMultiplier = hour >= 10 && hour < 17 ? 0.4 : hour >= 17 && hour < 22 ? 0.28 : 0.12;
  } else if (hour >= 9 && hour < 12) {
    baseMultiplier = 1.35;
  } else if (hour >= 12 && hour < 14) {
    baseMultiplier = 1.05;
  } else if (hour >= 14 && hour < 17) {
    baseMultiplier = 1.65;
  } else if (hour >= 17 && hour < 20) {
    baseMultiplier = 0.85;
  } else if (hour >= 7 && hour < 9) {
    baseMultiplier = 0.65;
  } else if (hour >= 20 && hour < 23) {
    baseMultiplier = 0.35;
  } else {
    baseMultiplier = 0.16;
  }

  if (profile === "interactive") {
    return Math.max(0.1, Math.min(1.9, baseMultiplier * (hour >= 9 && hour < 18 && !isWeekend ? 1.15 : 0.8)));
  }

  if (profile === "background") {
    return Math.max(0.18, Math.min(1.1, 0.45 + baseMultiplier * 0.35));
  }

  if (profile === "batch") {
    const batchMultiplier =
      !isWeekend && hour >= 18 && hour < 23 ? 0.9 : hour < 7 ? 0.55 : isWeekend ? 0.35 : baseMultiplier * 0.55;
    return Math.max(0.18, Math.min(1.1, batchMultiplier));
  }

  return baseMultiplier;
}

function getNextEnqueueDelayMs(config: DemoQueueConfig): number {
  const baseDelayMs = randomInt(config.intervalMs[0], config.intervalMs[1]);
  const pressureMultiplier = getWorkHourPressureMultiplier(config.pressureProfile);

  return Math.max(250, Math.round(baseDelayMs / pressureMultiplier));
}

export function startDemoWorker(redisUrl: string, logger: Logger): void {
  if (started) {
    if (DEMO_WORKER_LOGS_ENABLED) {
      logger.debug("Demo worker fleet already started");
    }
    return;
  }
  started = true;

  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const seederConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const queues = DEMO_QUEUES.map((config) => {
    const queue = new Queue(config.name, { connection: seederConnection });

    const addJob = async (source: "random" | "seed" | "scheduled", index?: number) => {
      const delayed = source === "random" && Math.random() < DELAYED_JOB_RATE;

      await queue.add(
        pick(config.jobNames),
        {
          source,
          tenantId: `tenant_${randomInt(100, 999)}`,
          requestId: crypto.randomUUID(),
          priority: pick(["low", "normal", "high"]),
          region: pick(["iad", "sfo", "fra", "sin"]),
          enqueuedAt: new Date().toISOString(),
          ...(index === undefined ? {} : { seedIndex: index }),
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1_000 },
          delay: delayed ? randomInt(5_000, MAX_DELAY_MS) : undefined,
          removeOnComplete: { age: 60 * 60, count: 1_000 },
          removeOnFail: { age: 24 * 60 * 60, count: 500 },
        },
      );
    };

    const worker = new Worker(
      config.name,
      async (job) => {
        const selectedSteps = STEP_NAMES.slice(0, randomInt(3, STEP_NAMES.length));
        const steps = selectedSteps.map((name) => ({
          name,
          status: "pending" as StepStatus,
        }));
        const totalDuration = randomInt(config.durationMs[0], config.durationMs[1]);
        const stepDuration = Math.max(100, Math.round(totalDuration / steps.length));

        for (let i = 0; i < steps.length; i++) {
          steps[i]!.status = "active";
          await job.updateProgress({
            currentStep: steps[i]!.name,
            percent: Math.round((i / steps.length) * 100),
            steps: steps.map((step, idx) => ({
              ...step,
              status: idx < i ? "completed" : idx === i ? "active" : "pending",
            })) as { name: string; status: StepStatus }[],
          });

          if (DEMO_WORKER_LOGS_ENABLED) {
            await job.log(
              JSON.stringify({
                v: 1,
                ts: Date.now(),
                level: "info",
                message: `Running ${steps[i]!.name}`,
                metadata: {
                  queue: config.name,
                  jobId: job.id,
                  jobName: job.name,
                  step: steps[i]!.name,
                  attempt: job.attemptsMade + 1,
                },
              }),
            );
          }

          await sleep(randomInt(Math.round(stepDuration * 0.6), Math.round(stepDuration * 1.4)));
          steps[i]!.status = "completed";
        }

        if (Math.random() < config.failureRate) {
          if (DEMO_WORKER_LOGS_ENABLED) {
            await job.log(
              JSON.stringify({
                v: 1,
                ts: Date.now(),
                level: "warn",
                message: "Transient downstream error",
                metadata: { queue: config.name, jobId: job.id, jobName: job.name },
              }),
            );
          }
          throw new Error("Demo transient downstream error");
        }

        await job.updateProgress({
          currentStep: "done",
          percent: 100,
          steps: steps.map((step) => ({ ...step, status: "completed" as const })),
        });

        if (DEMO_WORKER_LOGS_ENABLED) {
          await job.log(
            JSON.stringify({
              v: 1,
              ts: Date.now(),
              level: "info",
              message: "Job completed successfully",
              metadata: { queue: config.name, jobId: job.id, jobName: job.name },
            }),
          );
        }

        return {
          ok: true,
          queue: config.name,
          jobName: job.name,
          processedAt: new Date().toISOString(),
        };
      },
      { connection, concurrency: config.concurrency },
    );

    worker.on("failed", (job, err) => {
      if (DEMO_WORKER_LOGS_ENABLED) {
        logger.warn({ queue: config.name, jobId: job?.id, jobName: job?.name, err }, "Demo job failed");
      }
    });

    return { config, queue, addJob };
  });

  void Promise.all(
    queues.map(async ({ config, queue, addJob }) => {
      for (let i = 0; i < INITIAL_JOBS_PER_QUEUE; i++) {
        await addJob("seed", i);
      }

      if (config.scheduledEveryMs) {
        await queue.upsertJobScheduler(
          `${config.name}:scheduled`,
          { every: config.scheduledEveryMs },
          {
            name: pick(config.jobNames),
            data: {
              source: "scheduled",
              tenantId: "tenant_scheduled",
              requestId: crypto.randomUUID(),
              priority: "normal",
              region: "iad",
              enqueuedAt: new Date().toISOString(),
            },
            opts: {
              attempts: 3,
              backoff: { type: "exponential", delay: 1_000 },
              removeOnComplete: { age: 60 * 60, count: 1_000 },
              removeOnFail: { age: 24 * 60 * 60, count: 500 },
            },
          },
        );
      }
    }),
  )
    .then(() => {
      if (DEMO_WORKER_LOGS_ENABLED) {
        logger.info(
          {
            queues: queues.length,
            workers: queues.length,
            initialJobs: queues.length * INITIAL_JOBS_PER_QUEUE,
            scheduledQueues: queues.filter(({ config }) => Boolean(config.scheduledEveryMs)).length,
          },
          "Seeded demo worker fleet",
        );
      }
    })
    .catch((err) => {
      if (DEMO_WORKER_LOGS_ENABLED) {
        logger.warn({ err }, "Failed to seed demo worker fleet");
      }
    });

  for (const { config, addJob } of queues) {
    const enqueueNext = () => {
      const delayMs = getNextEnqueueDelayMs(config);
      setTimeout(() => {
        void addJob("random")
          .catch((err) => {
            if (DEMO_WORKER_LOGS_ENABLED) {
              logger.warn({ queue: config.name, err }, "Failed to enqueue demo job");
            }
          })
          .finally(enqueueNext);
      }, delayMs);
    };

    enqueueNext();
  }

  if (DEMO_WORKER_LOGS_ENABLED) {
    logger.info({ queues: queues.length, workers: queues.length }, "Demo worker fleet started");
  }
}
