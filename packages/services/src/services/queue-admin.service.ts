import {
  cleanQueue,
  drainQueue,
  obliterateQueue,
  pauseQueue,
  resumeQueue,
} from "@unqueue/bullmq";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import { assertRedisInstanceAccess } from "../rbac.js";
import type { Actor } from "../types.js";

export function createQueueAdminService(deps: ServiceDeps, logger: Logger) {
  async function getConnection(actor: Actor, redisInstanceId: string) {
    await assertRedisInstanceAccess(
      deps.db,
      actor.userId,
      redisInstanceId,
      "admin",
    );
    await deps.redisInstances.ensureRegistered(redisInstanceId);
    return deps.realtime.getConnection(redisInstanceId);
  }

  return {
    async pause(
      actor: Actor,
      input: { redisInstanceId: string; queueName: string },
    ) {
      logger.info(input, "Pausing queue");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await pauseQueue(connection, input.queueName, prefix);
      return { ok: true as const };
    },

    async resume(
      actor: Actor,
      input: { redisInstanceId: string; queueName: string },
    ) {
      logger.info(input, "Resuming queue");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await resumeQueue(connection, input.queueName, prefix);
      return { ok: true as const };
    },

    async drain(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        delayed: boolean;
      },
    ) {
      logger.info(input, "Draining queue");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await drainQueue(connection, input.queueName, prefix, input.delayed);
      return { ok: true as const };
    },

    async clean(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        grace: number;
        limit: number;
        type: "completed" | "failed" | "delayed" | "wait" | "paused";
      },
    ) {
      logger.info(input, "Cleaning queue");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      const removed = await cleanQueue(
        connection,
        input.queueName,
        prefix,
        input.grace,
        input.limit,
        input.type,
      );

      return { removed };
    },

    async obliterate(
      actor: Actor,
      input: { redisInstanceId: string; queueName: string },
    ) {
      logger.info(input, "Obliterating queue");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await obliterateQueue(connection, input.queueName, prefix);
      await deps.realtime.refreshDiscovery(input.redisInstanceId);

      return { ok: true as const };
    },
  };
}

export type QueueAdminService = ReturnType<typeof createQueueAdminService>;
