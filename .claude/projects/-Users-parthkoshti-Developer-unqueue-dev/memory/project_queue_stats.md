---
name: project-queue-stats
description: Queue Stats feature — what was built, key design decisions, and where things live
metadata:
  type: project
---

Queue Stats observability feature was implemented. It adds real-time + 30-day historical metrics for every discovered BullMQ queue.

**Why:** Users need queue health visibility (throughput, failures, counts over time) without storing individual job data.

**How to apply:** Future work on stats (charts, retention config, p99, new metric columns) should extend this foundation.

## Key files
- `packages/db/src/schema/app.ts` — `queueMetricSnapshots` table (serial PK, redis_instance_id FK, queue_name, snapshot_at, counts, throughput_per_minute, failure_rate, p95_runtime_ms, etc.)
- `packages/db/drizzle/0004_queue_metric_snapshots.sql` — migration
- `apps/server/src/stats-flusher.ts` — `StatsFlusher` class: flushes every 60s from `MetricsAggregator` to DB, cleans up rows >30 days old daily
- `apps/server/src/realtime/manager.ts` — added `getAllRegisteredQueues()` public method
- `packages/services/src/services/stats.service.ts` — `getQueueHistory(actor, { redisInstanceId, queueName, hours })` queries snapshots
- `packages/orpc/src/router.ts` — `stats.getQueueHistory` endpoint
- `apps/platform/src/routes/$workspaceId/$environmentId/stats.tsx` — stats page: live table of all queues + expandable per-queue 24h sparkline charts (pure SVG, no chart lib)
- `apps/platform/src/components/nav-main.tsx` — "Stats" nav link added

## Ingestion design
Snapshots are flushed from the in-memory `MetricsAggregator` (not from Redis directly). The aggregator is fed by QueueEvents (BullMQ). This means stats are accurate only while the server is running — no backfill on restart, but history persists across restarts once snapshotted.

## Out of scope (intentionally)
Job payloads, logs, job-level search/replay, worker host metrics.
