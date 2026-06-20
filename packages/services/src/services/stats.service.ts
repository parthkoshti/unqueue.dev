import { and, asc, eq, gte } from "drizzle-orm";
import { queueMetricSnapshots } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import { assertRedisInstanceAccess } from "../rbac.js";
import type { Actor } from "../types.js";

export function createStatsService(deps: ServiceDeps, logger: Logger) {
  return {
    async getQueueHistory(
      actor: Actor,
      input: { redisInstanceId: string; queueName: string; hours?: number },
    ) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        input.redisInstanceId,
        "viewer",
      );

      const hours = input.hours ?? 24;
      const since = new Date(Date.now() - hours * 60 * 60_000);

      logger.debug(input, "Getting queue history");

      return deps.db
        .select()
        .from(queueMetricSnapshots)
        .where(
          and(
            eq(queueMetricSnapshots.redisInstanceId, input.redisInstanceId),
            eq(queueMetricSnapshots.queueName, input.queueName),
            gte(queueMetricSnapshots.snapshotAt, since),
          ),
        )
        .orderBy(asc(queueMetricSnapshots.snapshotAt));
    },
  };
}

export type StatsService = ReturnType<typeof createStatsService>;
