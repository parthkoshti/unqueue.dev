import type {
  QueueMeta,
  QueueMetrics,
  QueuePoolContext,
  RedisConnection,
  RedisInstanceConfig,
  WindowKey,
} from "@unstall/bullmq";

export type RealtimeGateway = {
  getQueues(redisInstanceId: string): string[];
  getQueueMeta(redisInstanceId: string, queueName: string): Promise<QueueMeta>;
  getCachedQueueMeta(
    redisInstanceId: string,
    queueName: string,
    options?: { forceRefresh?: boolean },
  ): Promise<QueueMeta>;
  refreshCounts(redisInstanceId: string, queueName: string): Promise<void>;
  listQueueMeta(
    redisInstanceId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<QueueMeta[]>;
  getQueueMetrics(
    redisInstanceId: string,
    queueName: string,
    window: WindowKey,
  ): QueueMetrics;
  refreshDiscovery(redisInstanceId: string): Promise<string[]>;
  hasInstance(redisInstanceId: string): boolean;
  awaitRegistration(redisInstanceId: string): Promise<void>;
  ensureQueuesDiscovered(redisInstanceId: string): Promise<string[]>;
  getConnection(redisInstanceId: string): {
    connection: RedisConnection;
    prefix: string;
    queuePool: QueuePoolContext;
  };
  registerInstance(config: RedisInstanceConfig): Promise<void>;
  unregisterInstance(redisInstanceId: string): Promise<void>;
};
