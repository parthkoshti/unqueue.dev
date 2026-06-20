CREATE TABLE "queue_metric_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"redis_instance_id" varchar(24) NOT NULL,
	"queue_name" text NOT NULL,
	"snapshot_at" timestamp NOT NULL,
	"waiting" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 0 NOT NULL,
	"delayed" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"throughput_per_minute" real DEFAULT 0 NOT NULL,
	"failure_rate" real DEFAULT 0 NOT NULL,
	"p95_runtime_ms" integer DEFAULT 0 NOT NULL,
	"completed_in_window" integer DEFAULT 0 NOT NULL,
	"failed_in_window" integer DEFAULT 0 NOT NULL,
	"stalled_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_metric_snapshots" ADD CONSTRAINT "queue_metric_snapshots_redis_instance_id_redis_instances_id_fk" FOREIGN KEY ("redis_instance_id") REFERENCES "public"."redis_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX "queue_metric_snapshots_lookup_idx" ON "queue_metric_snapshots" USING btree ("redis_instance_id","queue_name","snapshot_at");
