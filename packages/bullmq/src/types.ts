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
  priority?: number;
  stacktrace?: string[];
  returnValue?: unknown;
  opts?: {
    attempts?: number;
    backoff?: unknown;
    priority?: number;
    delay?: number;
    removeOnComplete?: unknown;
    removeOnFail?: unknown;
  };
};

export type QueueCounts = {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
  prioritized: number;
  "waiting-children": number;
  schedulers: number;
};

export type QueueMeta = {
  name: string;
  isPaused: boolean;
  counts: QueueCounts;
};

export type RedisInstanceConfig = {
  id: string;
  workspaceId: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
  tlsServername?: string;
  bullmqPrefix: string;
};
