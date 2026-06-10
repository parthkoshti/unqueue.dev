import {
  getJobLogs,
  getJobPayload,
  getJobProgress,
  getJobState,
  listJobs,
  type JobListState,
} from "@unqueue/bullmq";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import { notFound } from "../errors.js";
import { assertRedisInstanceAccess } from "../rbac.js";
import type { Actor } from "../types.js";

export function createJobService(deps: ServiceDeps, logger: Logger) {
  async function getConnection(actor: Actor, redisInstanceId: string) {
    await assertRedisInstanceAccess(
      deps.db,
      actor.userId,
      redisInstanceId,
      "viewer",
    );
    await deps.redisInstances.ensureRegistered(redisInstanceId);
    return deps.realtime.getConnection(redisInstanceId);
  }

  return {
    async list(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        state: JobListState;
        start: number;
        end: number;
      },
    ) {
      logger.debug(
        {
          redisInstanceId: input.redisInstanceId,
          queueName: input.queueName,
          state: input.state,
        },
        "Listing jobs",
      );

      const { connection, prefix, queuePool } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return listJobs(
        connection,
        input.queueName,
        prefix,
        input.state,
        input.start,
        input.end,
        queuePool,
      );
    },

    async get(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      logger.debug(
        {
          redisInstanceId: input.redisInstanceId,
          queueName: input.queueName,
          jobId: input.jobId,
        },
        "Getting job",
      );

      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      const job = await getJobState(
        connection,
        input.queueName,
        prefix,
        input.jobId,
      );

      if (!job) notFound("Job");
      return job;
    },

    async getPayload(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return getJobPayload(connection, input.queueName, prefix, input.jobId);
    },

    async getProgress(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return getJobProgress(connection, input.queueName, prefix, input.jobId);
    },

    async getLogs(
      actor: Actor,
      input: {
        redisInstanceId: string;
        queueName: string;
        jobId: string;
      },
    ) {
      const { connection, prefix } = await getConnection(
        actor,
        input.redisInstanceId,
      );
      return getJobLogs(connection, input.queueName, prefix, input.jobId);
    },
  };
}

export type JobService = ReturnType<typeof createJobService>;
