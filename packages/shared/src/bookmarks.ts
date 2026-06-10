export type JobBookmarkTargetRef = {
  redisInstanceId: string;
  queueName: string;
  jobId: string;
  environmentId: string;
};

export type ParsedLogSnapshot = {
  format: "json" | "raw";
  entry?: {
    ts: number;
    level: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
  raw?: string;
};

export type JobSummarySnapshot = {
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

export type JobBookmarkSnapshot = {
  capturedAt: string;
  job: JobSummarySnapshot;
  payload: unknown;
  progress: unknown;
  logs: ParsedLogSnapshot[];
};
