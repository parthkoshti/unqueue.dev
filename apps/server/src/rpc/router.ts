import { os } from "@orpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createId, ROLES } from "@unstall/shared";
import {
  alertConditionSchema,
  redisInstanceInputSchema,
} from "@unstall/validators";
import {
  listJobs,
  getJobState,
  getJobPayload,
  getJobProgress,
  getJobLogs,
  retryJob,
  removeJob,
  promoteJob,
  bulkRetry,
  bulkRemove,
  pauseQueue,
  resumeQueue,
  drainQueue,
  cleanQueue,
  obliterateQueue,
  type JobState,
} from "@unstall/bullmq";
import { testRedisConnection } from "@unstall/redis";
import {
  alerts,
  alertEvents,
  bookmarkFolders,
  bookmarks,
  environments,
  redisInstances,
  workspaceInvites,
  workspaceMembers,
  workspaces,
  users,
} from "@unstall/db/schema";
import { authed, requireRole } from "./middleware.js";
import { ORPCError } from "@orpc/server";
import type { ServerContext } from "./context.js";

function notFound(resource = "Resource"): never {
  throw new ORPCError("NOT_FOUND", { message: `${resource} not found` });
}

function forbidden(): never {
  throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
}
import { encryptSecret } from "../encryption-service.js";
import type { EncryptedEnvelope } from "@unstall/shared";
import { createHash, randomBytes } from "node:crypto";

const base = os.$context<ServerContext>();

const workspaceRouter = {
  list: base.use(authed).handler(async ({ context }) => {
    const { db, user } = context;
    return db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        role: workspaceMembers.role,
        createdAt: workspaces.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, user!.id));
  }),

  get: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const [workspace] = await context.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .limit(1);
      if (!workspace) notFound("Workspace");
      return workspace;
    }),
};

const membersRouter = {
  list: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: workspaceMembers.role,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));
    }),

  invite: base
    .input(
      z.object({
        workspaceId: z.string().length(24),
        email: z.string().email(),
        role: z.enum(ROLES).refine((r) => r !== "owner", "Cannot invite as owner"),
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const id = createId();
      await context.db.insert(workspaceInvites).values({
        id,
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: context.user!.id,
      });
      const platformURL = process.env.PLATFORM_URL ?? "http://localhost:5173";
      return { inviteUrl: `${platformURL}/invite/${token}`, id };
    }),
};

const environmentRouter = {
  list: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(environments)
        .where(eq(environments.workspaceId, input.workspaceId));
    }),

  create: base
    .input(z.object({ workspaceId: z.string().length(24), name: z.string().min(1) }))
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const id = createId();
      await context.db.insert(environments).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
      });
      return { id };
    }),
};

const redisRouter = {
  list: base
    .input(z.object({ environmentId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const rows = await context.db
        .select({
          id: redisInstances.id,
          nickname: redisInstances.nickname,
          port: redisInstances.port,
          tls: redisInstances.tls,
          bullmqPrefix: redisInstances.bullmqPrefix,
          status: redisInstances.status,
          lastConnectedAt: redisInstances.lastConnectedAt,
          lastError: redisInstances.lastError,
          host: redisInstances.host,
        })
        .from(redisInstances)
        .where(eq(redisInstances.environmentId, input.environmentId));

      const role = context.membership?.role;
      if (role !== "owner" && role !== "admin") {
        return rows.map(({ host, ...rest }) => ({ ...rest, host: undefined }));
      }
      return rows;
    }),

  create: base
    .input(
      z.object({
        environmentId: z.string().length(24),
        ...redisInstanceInputSchema.shape,
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const id = createId();
      const encryptedCredentials = encryptSecret(input.password ?? "");

      await context.db.insert(redisInstances).values({
        id,
        environmentId: input.environmentId,
        nickname: input.nickname,
        host: input.host,
        port: input.port,
        tls: input.tls,
        encryptedCredentials,
        bullmqPrefix: input.bullmqPrefix,
        status: "disconnected",
      });

      await context.realtime.registerInstance({
        id,
        host: input.host,
        port: input.port,
        password: input.password,
        tls: input.tls,
        bullmqPrefix: input.bullmqPrefix,
      });

      await context.db
        .update(redisInstances)
        .set({ status: "connected", lastConnectedAt: new Date(), lastError: null })
        .where(eq(redisInstances.id, id));

      return { id };
    }),

  testConnection: base
    .input(redisInstanceInputSchema)
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ input }) => {
      return testRedisConnection({
        host: input.host,
        port: input.port,
        password: input.password,
        tls: input.tls,
      });
    }),

  delete: base
    .input(z.object({ id: z.string().length(24) }))
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      await context.realtime.unregisterInstance(input.id);
      await context.db.delete(redisInstances).where(eq(redisInstances.id, input.id));
      return { ok: true as const };
    }),
};

const queueRouter = {
  list: base
    .input(z.object({ redisInstanceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const queues = context.realtime.getQueues(input.redisInstanceId);
      const metas = await Promise.all(
        queues.map(async (name) => {
          try {
            return await context.realtime.getQueueMeta(input.redisInstanceId, name);
          } catch {
            return null;
          }
        }),
      );
      return metas.filter(Boolean);
    }),

  refreshDiscovery: base
    .input(z.object({ redisInstanceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const queues = await context.realtime.refreshDiscovery(input.redisInstanceId);
      return { queues };
    }),
};

const jobRouter = {
  list: base
    .input(
      z.object({
        redisInstanceId: z.string().length(24),
        queueName: z.string(),
        state: z.enum([
          "waiting",
          "active",
          "delayed",
          "completed",
          "failed",
          "paused",
        ]),
        start: z.number().int().min(0).default(0),
        end: z.number().int().min(0).default(49),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return listJobs(
        connection,
        input.queueName,
        prefix,
        input.state as JobState,
        input.start,
        input.end,
      );
    }),

  get: base
    .input(
      z.object({
        redisInstanceId: z.string().length(24),
        queueName: z.string(),
        jobId: z.string(),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
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
    }),

  getPayload: base
    .input(
      z.object({
        redisInstanceId: z.string().length(24),
        queueName: z.string(),
        jobId: z.string(),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return getJobPayload(
        connection,
        input.queueName,
        prefix,
        input.jobId,
      );
    }),

  getProgress: base
    .input(
      z.object({
        redisInstanceId: z.string().length(24),
        queueName: z.string(),
        jobId: z.string(),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return getJobProgress(
        connection,
        input.queueName,
        prefix,
        input.jobId,
      );
    }),

  getLogs: base
    .input(
      z.object({
        redisInstanceId: z.string().length(24),
        queueName: z.string(),
        jobId: z.string(),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return getJobLogs(
        connection,
        input.queueName,
        prefix,
        input.jobId,
      );
    }),
};

const jobActionInput = z.object({
  redisInstanceId: z.string().length(24),
  queueName: z.string(),
  jobId: z.string(),
});

const bulkJobActionInput = z.object({
  redisInstanceId: z.string().length(24),
  queueName: z.string(),
  jobIds: z.array(z.string()).min(1),
});

const queueActionInput = z.object({
  redisInstanceId: z.string().length(24),
  queueName: z.string(),
});

const jobActionsRouter = {
  retry: base
    .input(jobActionInput)
    .use(authed)
    .use(requireRole("member"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await retryJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    }),

  remove: base
    .input(jobActionInput)
    .use(authed)
    .use(requireRole("member"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await removeJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    }),

  promote: base
    .input(jobActionInput)
    .use(authed)
    .use(requireRole("member"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await promoteJob(connection, input.queueName, prefix, input.jobId);
      return { ok: true as const };
    }),

  bulkRetry: base
    .input(bulkJobActionInput)
    .use(authed)
    .use(requireRole("member"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return bulkRetry(
        connection,
        input.queueName,
        prefix,
        input.jobIds,
      );
    }),

  bulkRemove: base
    .input(bulkJobActionInput)
    .use(authed)
    .use(requireRole("member"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      return bulkRemove(
        connection,
        input.queueName,
        prefix,
        input.jobIds,
      );
    }),
};

const queueAdminRouter = {
  pause: base
    .input(queueActionInput)
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await pauseQueue(connection, input.queueName, prefix);
      return { ok: true as const };
    }),

  resume: base
    .input(queueActionInput)
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await resumeQueue(connection, input.queueName, prefix);
      return { ok: true as const };
    }),

  drain: base
    .input(queueActionInput.extend({ delayed: z.boolean().default(false) }))
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await drainQueue(connection, input.queueName, prefix, input.delayed);
      return { ok: true as const };
    }),

  clean: base
    .input(
      queueActionInput.extend({
        grace: z.number().default(0),
        limit: z.number().default(1000),
        type: z.enum(["completed", "failed", "delayed", "wait", "paused"]),
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
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
    }),

  obliterate: base
    .input(queueActionInput)
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const { connection, prefix } = context.realtime.getConnection(
        input.redisInstanceId,
      );
      await obliterateQueue(connection, input.queueName, prefix);
      await context.realtime.refreshDiscovery(input.redisInstanceId);
      return { ok: true as const };
    }),
};

const bookmarkRouter = {
  list: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.workspaceId, input.workspaceId));
    }),

  create: base
    .input(
      z.object({
        workspaceId: z.string().length(24),
        folderId: z.string().length(24).optional(),
        targetType: z.enum(["queue", "job"]),
        targetRef: z.record(z.unknown()),
        isShared: z.boolean().default(false),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const id = createId();
      await context.db.insert(bookmarks).values({
        id,
        workspaceId: input.workspaceId,
        folderId: input.folderId,
        targetType: input.targetType,
        targetRef: input.targetRef,
        isShared: input.isShared,
        createdBy: context.user!.id,
      });
      return { id };
    }),

  delete: base
    .input(z.object({ id: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      await context.db.delete(bookmarks).where(eq(bookmarks.id, input.id));
      return { ok: true as const };
    }),

  createFolder: base
    .input(
      z.object({
        workspaceId: z.string().length(24),
        name: z.string().min(1),
        parentId: z.string().length(24).optional(),
      }),
    )
    .use(authed)
    .handler(async ({ context, input }) => {
      const id = createId();
      await context.db.insert(bookmarkFolders).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
        parentId: input.parentId,
        createdBy: context.user!.id,
      });
      return { id };
    }),

  listFolders: base
    .input(z.object({ workspaceId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(bookmarkFolders)
        .where(eq(bookmarkFolders.workspaceId, input.workspaceId));
    }),
};

const alertRouter = {
  list: base
    .input(z.object({ environmentId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select({
          id: alerts.id,
          name: alerts.name,
          queueName: alerts.queueName,
          redisInstanceId: alerts.redisInstanceId,
          enabled: alerts.enabled,
          config: alerts.config,
          intervalMinutes: alerts.intervalMinutes,
          cooldownMinutes: alerts.cooldownMinutes,
        })
        .from(alerts)
        .where(eq(alerts.environmentId, input.environmentId));
    }),

  create: base
    .input(
      z.object({
        environmentId: z.string().length(24),
        redisInstanceId: z.string().length(24),
        name: z.string().min(1),
        queueName: z.string().min(1),
        webhookUrl: z.string().url(),
        condition: alertConditionSchema,
        intervalMinutes: z.number().int().min(1).default(15),
        cooldownMinutes: z.number().int().min(1).default(15),
      }),
    )
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      const id = createId();
      await context.db.insert(alerts).values({
        id,
        environmentId: input.environmentId,
        redisInstanceId: input.redisInstanceId,
        name: input.name,
        queueName: input.queueName,
        config: { condition: input.condition },
        encryptedWebhook: encryptSecret(input.webhookUrl),
        intervalMinutes: input.intervalMinutes,
        cooldownMinutes: input.cooldownMinutes,
      });

      const [alert] = await context.db
        .select()
        .from(alerts)
        .where(eq(alerts.id, id))
        .limit(1);
      if (alert) context.alertEngine.scheduleAlert(alert);

      return { id };
    }),

  delete: base
    .input(z.object({ id: z.string().length(24) }))
    .use(authed)
    .use(requireRole("admin"))
    .handler(async ({ context, input }) => {
      context.alertEngine.stopAlert(input.id);
      await context.db.delete(alerts).where(eq(alerts.id, input.id));
      return { ok: true as const };
    }),

  listEvents: base
    .input(z.object({ alertId: z.string().length(24) }))
    .use(authed)
    .handler(async ({ context, input }) => {
      return context.db
        .select()
        .from(alertEvents)
        .where(eq(alertEvents.alertId, input.alertId));
    }),
};

const inviteRouter = {
  accept: base
    .input(z.object({ token: z.string() }))
    .use(authed)
    .handler(async ({ context, input }) => {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const [invite] = await context.db
        .select()
        .from(workspaceInvites)
        .where(eq(workspaceInvites.tokenHash, tokenHash))
        .limit(1);

      if (!invite || invite.acceptedAt) notFound("Invite");
      if (invite.expiresAt < new Date()) forbidden();

      await context.db.insert(workspaceMembers).values({
        id: createId(),
        workspaceId: invite.workspaceId,
        userId: context.user!.id,
        role: invite.role,
      });

      await context.db
        .update(workspaceInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(workspaceInvites.id, invite.id));

      return { workspaceId: invite.workspaceId };
    }),
};

export const appRouter = {
  workspace: workspaceRouter,
  members: membersRouter,
  environment: environmentRouter,
  redis: redisRouter,
  queue: queueRouter,
  job: jobRouter,
  jobActions: jobActionsRouter,
  queueAdmin: queueAdminRouter,
  bookmark: bookmarkRouter,
  alert: alertRouter,
  invite: inviteRouter,
};

export type AppRouter = typeof appRouter;
