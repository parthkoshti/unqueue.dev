import type { AlertCondition } from "@unstall/validators";

export function evaluateCondition(
  condition: AlertCondition,
  metrics: {
    failureRate: number;
    queueLagMs: number;
    waiting: number;
    stalledCount: number;
  },
): boolean {
  switch (condition.type) {
    case "failure_rate":
      return metrics.failureRate >= condition.threshold;
    case "stalled":
      return metrics.stalledCount >= condition.minStalledJobs;
    case "queue_lag":
      return metrics.queueLagMs >= condition.maxLagMs;
    case "waiting_jobs":
      return metrics.waiting >= condition.threshold;
    default:
      return false;
  }
}
