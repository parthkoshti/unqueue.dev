import type { EnvironmentQueueRow } from "@/components/environment-queues-table";

export type QueueJobTotals = {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
};

export type EnvironmentQueueStats = {
  queueCount: number;
  runningQueues: number;
  pausedQueues: number;
  totals: QueueJobTotals;
  totalJobs: number;
  backlog: number;
  finishedJobs: number;
  successRate: number | null;
  queuesWithFailures: number;
  queuesWithBacklog: number;
};

export type AttentionQueue = EnvironmentQueueRow & {
  backlog: number;
};

const JOB_STATES = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
  "paused",
] as const satisfies ReadonlyArray<keyof QueueJobTotals>;

export function sumQueueCounts(queue: EnvironmentQueueRow) {
  return JOB_STATES.reduce((sum, state) => sum + queue.counts[state], 0);
}

export function queueFailureRate(queue: EnvironmentQueueRow): number | null {
  const finished = queue.counts.completed + queue.counts.failed;
  if (finished === 0) return null;
  return queue.counts.failed / finished;
}

export function aggregateQueueStats(
  queues: EnvironmentQueueRow[],
): EnvironmentQueueStats {
  const totals: QueueJobTotals = {
    waiting: 0,
    active: 0,
    delayed: 0,
    completed: 0,
    failed: 0,
    paused: 0,
  };

  let pausedQueues = 0;
  let queuesWithFailures = 0;
  let queuesWithBacklog = 0;

  for (const queue of queues) {
    if (queue.isPaused) pausedQueues++;
    if (queue.counts.failed > 0) queuesWithFailures++;
    if (queue.counts.waiting + queue.counts.delayed > 0) queuesWithBacklog++;

    for (const state of JOB_STATES) {
      totals[state] += queue.counts[state];
    }
  }

  const totalJobs = JOB_STATES.reduce((sum, state) => sum + totals[state], 0);
  const backlog = totals.waiting + totals.delayed;
  const finishedJobs = totals.completed + totals.failed;
  const successRate =
    finishedJobs > 0 ? totals.completed / finishedJobs : null;

  return {
    queueCount: queues.length,
    runningQueues: queues.length - pausedQueues,
    pausedQueues,
    totals,
    totalJobs,
    backlog,
    finishedJobs,
    successRate,
    queuesWithFailures,
    queuesWithBacklog,
  };
}

export function getAttentionQueues(
  queues: EnvironmentQueueRow[],
  limit = 8,
): AttentionQueue[] {
  return queues
    .map((queue) => ({
      ...queue,
      backlog: queue.counts.waiting + queue.counts.delayed,
    }))
    .filter(
      (queue) =>
        queue.isPaused || queue.counts.failed > 0 || queue.backlog >= 10,
    )
    .sort((a, b) => {
      const rateA = queueFailureRate(a) ?? -Infinity;
      const rateB = queueFailureRate(b) ?? -Infinity;
      if (rateB !== rateA) return rateB - rateA;

      return (
        b.counts.failed - a.counts.failed ||
        b.backlog - a.backlog ||
        Number(b.isPaused) - Number(a.isPaused)
      );
    })
    .slice(0, limit);
}

export const JOB_STATE_META: Array<{
  key: keyof QueueJobTotals;
  label: string;
  barClass: string;
}> = [
  { key: "active", label: "Active", barClass: "bg-blue-500" },
  { key: "waiting", label: "Waiting", barClass: "bg-sky-500" },
  { key: "delayed", label: "Delayed", barClass: "bg-amber-500" },
  { key: "failed", label: "Failed", barClass: "bg-destructive" },
  { key: "completed", label: "Completed", barClass: "bg-emerald-500" },
  { key: "paused", label: "Paused", barClass: "bg-orange-500" },
];
