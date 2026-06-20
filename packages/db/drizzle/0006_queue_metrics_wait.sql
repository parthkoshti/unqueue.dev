ALTER TABLE "queue_metric_snapshots" ADD COLUMN "p95_wait_ms" integer NOT NULL DEFAULT 0;
ALTER TABLE "queue_metric_snapshots" ADD COLUMN "added_in_window" integer NOT NULL DEFAULT 0;
