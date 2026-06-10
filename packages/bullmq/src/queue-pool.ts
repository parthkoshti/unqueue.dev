import { Queue } from "bullmq";
import type { RedisConnection } from "./redis-types.js";

export class QueuePool {
  private queues = new Map<string, Queue>();

  private key(redisInstanceId: string, prefix: string, queueName: string): string {
    return `${redisInstanceId}:${prefix}:${queueName}`;
  }

  getQueue(
    redisInstanceId: string,
    connection: RedisConnection,
    queueName: string,
    prefix: string,
  ): Queue {
    const k = this.key(redisInstanceId, prefix, queueName);
    let queue = this.queues.get(k);
    if (!queue) {
      queue = new Queue(queueName, {
        connection: connection as never,
        prefix,
      });
      this.queues.set(k, queue);
    }
    return queue;
  }

  async closeForInstance(redisInstanceId: string): Promise<void> {
    const prefix = `${redisInstanceId}:`;
    const toClose: Queue[] = [];

    for (const [k, queue] of this.queues) {
      if (k.startsWith(prefix)) {
        toClose.push(queue);
        this.queues.delete(k);
      }
    }

    await Promise.all(toClose.map((queue) => queue.close()));
  }

  async closeAll(): Promise<void> {
    const all = [...this.queues.values()];
    this.queues.clear();
    await Promise.all(all.map((queue) => queue.close()));
  }
}
