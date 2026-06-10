import type { QueuePool } from "./queue-pool.js";

export type QueuePoolContext = {
  instance: QueuePool;
  redisInstanceId: string;
};
