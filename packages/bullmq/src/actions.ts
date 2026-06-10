import { Queue } from "bullmq";
import type { RedisConnection } from "./redis-types.js";

export async function retryJob(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  const job = await queue.getJob(jobId);
  if (!job) throw new Error("Job not found");
  await job.retry();
}

export async function removeJob(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  const job = await queue.getJob(jobId);
  if (!job) throw new Error("Job not found");
  await job.remove();
}

export async function promoteJob(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobId: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  const job = await queue.getJob(jobId);
  if (!job) throw new Error("Job not found");
  await job.promote();
}

export async function bulkRetry(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobIds: string[],
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const jobId of jobIds) {
    try {
      await retryJob(connection, queueName, prefix, jobId);
      succeeded.push(jobId);
    } catch {
      failed.push(jobId);
    }
  }

  return { succeeded, failed };
}

export async function bulkRemove(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  jobIds: string[],
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const jobId of jobIds) {
    try {
      await removeJob(connection, queueName, prefix, jobId);
      succeeded.push(jobId);
    } catch {
      failed.push(jobId);
    }
  }

  return { succeeded, failed };
}

export async function pauseQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  await queue.pause();
}

export async function resumeQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  await queue.resume();
}

export async function drainQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  delayed = false,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  await queue.drain(delayed);
}

export async function cleanQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  grace: number,
  limit: number,
  type: "completed" | "failed" | "delayed" | "wait" | "paused",
): Promise<string[]> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  return queue.clean(grace, limit, type);
}

export async function obliterateQueue(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
): Promise<void> {
  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  await queue.obliterate({ force: true });
}
