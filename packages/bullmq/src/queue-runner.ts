import { Queue } from "bullmq";
import type { RedisConnection } from "./redis-types.js";
import type { QueuePoolContext } from "./queue-pool-context.js";
import type { QueuePool } from "./queue-pool.js";

export async function withQueue<T>(
  connection: RedisConnection,
  queueName: string,
  prefix: string,
  fn: (queue: Queue) => Promise<T>,
  pool?: QueuePoolContext,
): Promise<T> {
  if (pool) {
    const queue = pool.instance.getQueue(
      pool.redisInstanceId,
      connection,
      queueName,
      prefix,
    );
    return fn(queue);
  }

  const queue = new Queue(queueName, {
    connection: connection as never,
    prefix,
  });
  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}
