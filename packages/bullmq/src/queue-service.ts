import { Job, Queue } from "bullmq";
import type { RedisConnection } from "./redis-types.js";
import { jobLogSchema } from "@unstall/validators";
import type { JobSummary, QueueCounts, QueueMeta } from "./types.js";

export function createQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
): Queue {
  return new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
}

export async function getQueueMeta(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
): Promise<QueueMeta> {
  const queue = createQueue(connection, queueName, prefix);
  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
      "paused",
    ),
    queue.isPaused(),
  ]);

  return {
    name: queueName,
    isPaused,
    counts: counts as QueueCounts,
  };
}

const JOB_STATES = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
  "paused",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export async function listJobs(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  state: JobState,
  start = 0,
  end = 49,
): Promise<JobSummary[]> {
  const queue = createQueue(connection, queueName, prefix);
  const jobs = await queue.getJobs([state], start, end, false);

  const summaries = await Promise.all(
    jobs
      .filter((job): job is Job => job !== null)
      .map(async (job) => ({
        ...toJobSummary(job),
        state: await job.getState(),
      })),
  );

  return summaries.sort((a, b) => b.timestamp - a.timestamp);
}

export function toJobSummary(job: Job): JobSummary {
  return {
    id: job.id ?? "",
    name: job.name,
    state: "",
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    delay: job.delay,
  };
}

export async function getJobState(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<JobSummary | null> {
  const queue = createQueue(connection, queueName, prefix);
  const job = await queue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return { ...toJobSummary(job), state };
}

export async function getJobPayload(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<unknown> {
  const queue = createQueue(connection, queueName, prefix);
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return job.data;
}

export async function getJobProgress(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<unknown> {
  const queue = createQueue(connection, queueName, prefix);
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return job.progress;
}

export type ParsedLog = {
  format: "json" | "raw";
  entry?: {
    ts: number;
    level: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
  raw?: string;
};

export async function getJobLogs(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<ParsedLog[]> {
  const queue = createQueue(connection, queueName, prefix);
  const { logs } = await queue.getJobLogs(jobId);
  return logs.map(parseLogLine);
}

function parseLogLine(line: string): ParsedLog {
  try {
    const parsed = JSON.parse(line);
    const result = jobLogSchema.safeParse(parsed);
    if (result.success) {
      return { format: "json", entry: result.data };
    }
  } catch {
    // fall through
  }
  return { format: "raw", raw: line };
}
