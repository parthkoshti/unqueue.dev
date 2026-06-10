ALTER TABLE "redis_instances" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "redis_instances" ADD COLUMN "db" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "redis_instances" ADD COLUMN "tls_servername" text;