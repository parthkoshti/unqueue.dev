export type JobSummary = {
  id: string;
  name: string;
  state: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade: number;
  failedReason?: string;
  delay?: number;
};

export type QueueCounts = {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
};

export type QueueMeta = {
  name: string;
  isPaused: boolean;
  counts: QueueCounts;
};

export type RedisInstanceConfig = {
  id: string;
  host: string;
  port: number;
  password?: string;
  tls: boolean;
  bullmqPrefix: string;
};
