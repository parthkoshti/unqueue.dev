const WINDOWS = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "24h": 86_400_000,
} as const;

export type WindowKey = keyof typeof WINDOWS;

export type QueueMetrics = {
  throughputPerMinute: number;
  active: number;
  waiting: number;
  delayed: number;
  completed: number;
  failed: number;
  successRate: number;
  failureRate: number;
  p95RuntimeMs: number;
  p99RuntimeMs: number;
  queueLagMs: number;
  stalledCount: number;
};

type CompletionEvent = {
  timestamp: number;
  runtimeMs: number;
  success: boolean;
};

type MetricsState = {
  completions: CompletionEvent[];
  failed: number;
  completed: number;
  stalledCount: number;
  oldestWaitingTimestamp?: number;
  liveCounts: {
    active: number;
    waiting: number;
    delayed: number;
    completed: number;
    failed: number;
  };
};

export class MetricsAggregator {
  private states = new Map<string, MetricsState>();

  private key(redisId: string, queueName: string): string {
    return `${redisId}:${queueName}`;
  }

  private getState(redisId: string, queueName: string): MetricsState {
    const k = this.key(redisId, queueName);
    let state = this.states.get(k);
    if (!state) {
      state = {
        completions: [],
        failed: 0,
        completed: 0,
        stalledCount: 0,
        liveCounts: {
          active: 0,
          waiting: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
        },
      };
      this.states.set(k, state);
    }
    return state;
  }

  updateCounts(
    redisId: string,
    queueName: string,
    counts: MetricsState["liveCounts"],
  ): void {
    const state = this.getState(redisId, queueName);
    state.liveCounts = counts;
  }

  recordCompletion(
    redisId: string,
    queueName: string,
    runtimeMs: number,
    success: boolean,
  ): void {
    const state = this.getState(redisId, queueName);
    const now = Date.now();
    state.completions.push({ timestamp: now, runtimeMs, success });
    if (success) state.completed++;
    else state.failed++;
    this.prune(state, now);
  }

  recordStalled(redisId: string, queueName: string): void {
    this.getState(redisId, queueName).stalledCount++;
  }

  setOldestWaiting(
    redisId: string,
    queueName: string,
    timestamp?: number,
  ): void {
    this.getState(redisId, queueName).oldestWaitingTimestamp = timestamp;
  }

  getMetrics(
    redisId: string,
    queueName: string,
    window: WindowKey = "5m",
  ): QueueMetrics {
    const state = this.getState(redisId, queueName);
    const now = Date.now();
    this.prune(state, now);

    const windowMs = WINDOWS[window];
    const inWindow = state.completions.filter(
      (c) => c.timestamp >= now - windowMs,
    );
    const completedInWindow = inWindow.filter((c) => c.success).length;
    const failedInWindow = inWindow.filter((c) => !c.success).length;
    const total = completedInWindow + failedInWindow;
    const runtimes = inWindow.map((c) => c.runtimeMs).sort((a, b) => a - b);

    const windowMinutes = windowMs / 60_000;
    const queueLagMs = state.oldestWaitingTimestamp
      ? now - state.oldestWaitingTimestamp
      : 0;

    return {
      throughputPerMinute: completedInWindow / windowMinutes,
      active: state.liveCounts.active,
      waiting: state.liveCounts.waiting,
      delayed: state.liveCounts.delayed,
      completed: state.liveCounts.completed,
      failed: state.liveCounts.failed,
      successRate: total > 0 ? completedInWindow / total : 1,
      failureRate: total > 0 ? failedInWindow / total : 0,
      p95RuntimeMs: percentile(runtimes, 0.95),
      p99RuntimeMs: percentile(runtimes, 0.99),
      queueLagMs,
      stalledCount: state.stalledCount,
    };
  }

  private prune(state: MetricsState, now: number): void {
    const maxWindow = WINDOWS["24h"];
    state.completions = state.completions.filter(
      (c) => c.timestamp >= now - maxWindow,
    );
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}
