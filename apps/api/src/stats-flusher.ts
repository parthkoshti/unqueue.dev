import { lt } from "drizzle-orm";
import type { Database } from "@unqueue/db";
import { queueMetricSnapshots } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { RealtimeManager } from "./realtime/manager.js";

const FLUSH_INTERVAL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60_000;
const RETENTION_DAYS = 30;

export class StatsFlusher {
  private flushTimer?: ReturnType<typeof setInterval>;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private db: Database,
    private realtime: RealtimeManager,
    private logger: Logger,
  ) {}

  start(): void {
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    this.cleanupTimer = setInterval(() => void this.cleanup(), CLEANUP_INTERVAL_MS);
    void this.cleanup();
  }

  stop(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private async flush(): Promise<void> {
    const allQueues = this.realtime.getAllRegisteredQueues();
    if (allQueues.length === 0) return;

    const snapshotAt = new Date();
    snapshotAt.setSeconds(0, 0);

    const rows = allQueues.map(({ redisInstanceId, queueName }) => {
      const m = this.realtime.getQueueMetrics(redisInstanceId, queueName, "5m");
      return {
        redisInstanceId,
        queueName,
        snapshotAt,
        waiting: m.waiting,
        active: m.active,
        delayed: m.delayed,
        completed: m.completed,
        failed: m.failed,
        throughputPerMinute: m.throughputPerMinute,
        failureRate: m.failureRate,
        p95RuntimeMs: m.p95RuntimeMs,
        completedInWindow: m.completedInWindow,
        failedInWindow: m.failedInWindow,
        addedInWindow: m.addedInWindow,
        stalledCount: m.stalledCount,
        p95WaitMs: m.p95WaitMs,
      };
    });

    try {
      await this.db.insert(queueMetricSnapshots).values(rows).onConflictDoNothing();
      this.logger.debug({ count: rows.length }, "Flushed queue metric snapshots");
    } catch (err) {
      this.logger.error({ err }, "Failed to flush queue metric snapshots");
    }
  }

  private async cleanup(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    try {
      const result = await this.db
        .delete(queueMetricSnapshots)
        .where(lt(queueMetricSnapshots.snapshotAt, cutoff));
      this.logger.debug({ cutoff }, "Cleaned up old queue metric snapshots");
      return result as unknown as void;
    } catch (err) {
      this.logger.error({ err }, "Failed to clean up old queue metric snapshots");
    }
  }
}
