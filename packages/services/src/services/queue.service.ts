import { eq } from "drizzle-orm";
import type { QueueMeta, WindowKey } from "@unqueue/bullmq";
import { redisInstances } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import {
  assertEnvironmentAccess,
  assertRedisInstanceAccess,
} from "../rbac.js";
import type { Actor } from "../types.js";

export type EnvironmentQueueRow = QueueMeta & { redisInstanceId: string };

export function createQueueService(deps: ServiceDeps, logger: Logger) {
  return {
    async getMeta(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        forceRefresh?: boolean;
      },
    ) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        input.redisInstanceId,
        "viewer",
      );
      await deps.redisInstances.ensureRegistered(input.redisInstanceId);
      logger.debug(input, "Getting queue meta");
      return deps.realtime.getCachedQueueMeta(
        input.redisInstanceId,
        input.queueName,
        { forceRefresh: input.forceRefresh },
      );
    },

    async getMetrics(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        window: WindowKey;
      },
    ) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        input.redisInstanceId,
        "viewer",
      );
      await deps.redisInstances.ensureRegistered(input.redisInstanceId);
      logger.debug(input, "Getting queue metrics");
      return deps.realtime.getQueueMetrics(
        input.redisInstanceId,
        input.queueName,
        input.window,
      );
    },

    /** Per-instance list; prefer listForEnvironment for dashboard use. */
    async list(actor: Actor, redisInstanceId: string) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        redisInstanceId,
        "viewer",
      );
      await deps.redisInstances.ensureRegistered(redisInstanceId);
      logger.debug({ redisInstanceId }, "Listing queues");
      return deps.realtime.listQueueMeta(redisInstanceId);
    },

    async listForEnvironment(
      actor: Actor,
      input: { environmentId: string; forceRefresh?: boolean },
    ) {
      const start = performance.now();
      const { workspaceId } = await assertEnvironmentAccess(
        deps.db,
        actor.userId,
        input.environmentId,
        "viewer",
      );

      // Select full config in one query so ensureRegisteredWithData skips
      // the per-instance DB lookup on cold start.
      const instanceRows = await deps.db
        .select()
        .from(redisInstances)
        .where(eq(redisInstances.environmentId, input.environmentId));

      const results = await Promise.all(
        instanceRows.map(async (instance) => {
          await deps.redisInstances.ensureRegisteredWithData({ instance, workspaceId });
          const metas = await deps.realtime.listQueueMeta(instance.id, {
            forceRefresh: input.forceRefresh,
          });
          return metas.map(
            (meta): EnvironmentQueueRow => ({
              ...meta,
              redisInstanceId: instance.id,
            }),
          );
        }),
      );

      const queues = results.flat();
      const durationMs = Math.round(performance.now() - start);

      logger.info(
        {
          environmentId: input.environmentId,
          durationMs,
          queueCount: queues.length,
          instanceCount: instanceRows.length,
          forceRefresh: input.forceRefresh ?? false,
        },
        "Listed environment queues",
      );

      return { queues, durationMs };
    },

    async refreshDiscovery(actor: Actor, redisInstanceId: string) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        redisInstanceId,
        "viewer",
      );
      await deps.redisInstances.ensureRegistered(redisInstanceId);
      logger.info({ redisInstanceId }, "Refreshing queue discovery");

      const queues = await deps.realtime.refreshDiscovery(redisInstanceId);
      return { queues };
    },
  };
}

export type QueueService = ReturnType<typeof createQueueService>;
