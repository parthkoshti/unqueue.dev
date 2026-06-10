import {
  bulkRemove,
  bulkRetry,
  promoteJob,
  removeJob,
  retryJob,
} from "@unstall/bullmq";
import type { Logger } from "@unstall/logger";
import type { ServiceDeps } from "../context.js";
import { assertRedisInstanceAccess } from "../rbac.js";
import type { Actor } from "../types.js";

export function createJobActionsService(deps: ServiceDeps, logger: Logger) {
  async function getConnection(actor: Actor, redisInstanceId: string) {
    await assertRedisInstanceAccess(
      deps.db,
      actor.userId,
      redisInstanceId,
      "member",
    );
    await deps.redisInstances.ensureRegistered(redisInstanceId);
    return deps.realtime.getConnection(redisInstanceId);
  }

  return {
    async retry(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      logger.info(input, "Retrying job");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await retryJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    },

    async remove(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      logger.info(input, "Removing job");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await removeJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    },

    async promote(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      logger.info(input, "Promoting job");

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      await promoteJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    },

    async bulkRetry(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobIds: string[];
      },
    ) {
      logger.info(
        {
          redisInstanceId: input.redisInstanceId,
          queueName: input.queueName,
          count: input.jobIds.length,
        },
        "Bulk retrying jobs",
      );

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return bulkRetry(connection, input.queueName, prefix, input.jobIds);
    },

    async bulkRemove(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobIds: string[];
      },
    ) {
      logger.info(
        {
          redisInstanceId: input.redisInstanceId,
          queueName: input.queueName,
          count: input.jobIds.length,
        },
        "Bulk removing jobs",
      );

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return bulkRemove(connection, input.queueName, prefix, input.jobIds);
    },
  };
}

export type JobActionsService = ReturnType<typeof createJobActionsService>;
