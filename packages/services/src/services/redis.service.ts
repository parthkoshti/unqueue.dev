import { eq } from "drizzle-orm";
import type { RedisInstanceConfig } from "@unqueue/bullmq";
import { createId } from "@unqueue/shared";
import type { EncryptedEnvelope } from "@unqueue/shared";
import { environments, redisInstances } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import { testRedisConnection } from "@unqueue/redis";
import type { ServiceDeps } from "../context.js";
import {
  assertEnvironmentAccess,
  assertRedisInstanceAccess,
  getWorkspaceIdForEnvironment,
} from "../rbac.js";
import type { Actor } from "../types.js";

type RedisInstanceInput = {
  nickname: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls: boolean;
  tlsServername?: string;
  bullmqPrefix: string;
};

function resolveDb(db?: number) {
  return db ?? 0;
}

type RedisInstanceRow = typeof redisInstances.$inferSelect;

function toConnectionInput(input: RedisInstanceInput) {
  return {
    host: input.host,
    port: input.port,
    username: input.username || undefined,
    password: input.password || undefined,
    db: resolveDb(input.db),
    tls: input.tls,
    tlsServername: input.tlsServername || undefined,
  };
}

function toRealtimeConfig(
  instance: RedisInstanceRow,
  workspaceId: string,
  password?: string,
): RedisInstanceConfig {
  return {
    id: instance.id,
    workspaceId,
    host: instance.host,
    port: instance.port,
    username: instance.username ?? undefined,
    password: password || undefined,
    db: instance.db,
    tls: instance.tls,
    tlsServername: instance.tlsServername ?? undefined,
    bullmqPrefix: instance.bullmqPrefix,
  };
}

export function createRedisService(deps: ServiceDeps, logger: Logger) {
  async function resolveWorkspaceId(environmentId: string): Promise<string> {
    const workspaceId = await getWorkspaceIdForEnvironment(
      deps.db,
      environmentId,
    );
    if (!workspaceId) {
      throw new Error("Environment not found");
    }
    return workspaceId;
  }

  return {
    async list(actor: Actor, environmentId: string) {
      const { role } = await assertEnvironmentAccess(
        deps.db,
        actor.userId,
        environmentId,
        "viewer",
      );

      logger.debug({ environmentId }, "Listing redis instances");

      const rows = await deps.db
        .select({
          id: redisInstances.id,
          nickname: redisInstances.nickname,
          port: redisInstances.port,
          username: redisInstances.username,
          db: redisInstances.db,
          tls: redisInstances.tls,
          tlsServername: redisInstances.tlsServername,
          bullmqPrefix: redisInstances.bullmqPrefix,
          status: redisInstances.status,
          lastConnectedAt: redisInstances.lastConnectedAt,
          lastError: redisInstances.lastError,
          host: redisInstances.host,
        })
        .from(redisInstances)
        .where(eq(redisInstances.environmentId, environmentId));

      if (role !== "owner" && role !== "admin") {
        return rows.map(({ host: _host, tlsServername: _tls, ...rest }) => ({
          ...rest,
          host: undefined,
          tlsServername: undefined,
        }));
      }

      return rows;
    },

    async create(actor: Actor, input: RedisInstanceInput & { environmentId: string }) {
      await assertEnvironmentAccess(
        deps.db,
        actor.userId,
        input.environmentId,
        "admin",
      );

      const workspaceId = await resolveWorkspaceId(input.environmentId);
      const id = createId();
      const encryptedCredentials = deps.encryption.encrypt(input.password ?? "");

      logger.info(
        { environmentId: input.environmentId, redisInstanceId: id, host: input.host },
        "Creating redis instance",
      );

      const row: RedisInstanceRow = {
        id,
        environmentId: input.environmentId,
        nickname: input.nickname,
        host: input.host,
        port: input.port,
        username: input.username ?? null,
        db: resolveDb(input.db),
        tls: input.tls,
        tlsServername: input.tlsServername ?? null,
        encryptedCredentials,
        bullmqPrefix: input.bullmqPrefix,
        status: "disconnected",
        lastConnectedAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await deps.db.insert(redisInstances).values({
        id: row.id,
        environmentId: row.environmentId,
        nickname: row.nickname,
        host: row.host,
        port: row.port,
        username: row.username,
        db: row.db,
        tls: row.tls,
        tlsServername: row.tlsServername,
        encryptedCredentials: row.encryptedCredentials,
        bullmqPrefix: row.bullmqPrefix,
        status: row.status,
      });

      await deps.realtime.registerInstance(
        toRealtimeConfig(row, workspaceId, input.password),
      );

      await deps.db
        .update(redisInstances)
        .set({ status: "connected", lastConnectedAt: new Date(), lastError: null })
        .where(eq(redisInstances.id, id));

      logger.info({ redisInstanceId: id }, "Redis instance connected");

      return { id };
    },

    async testConnection(
      actor: Actor,
      input: RedisInstanceInput & { id?: string; environmentId?: string },
    ) {
      if (input.id) {
        await assertRedisInstanceAccess(deps.db, actor.userId, input.id, "admin");
      } else if (input.environmentId) {
        await assertEnvironmentAccess(
          deps.db,
          actor.userId,
          input.environmentId,
          "admin",
        );
      }

      logger.debug({ host: input.host, port: input.port }, "Testing redis connection");

      let password = input.password;

      if ((password === undefined || password === "") && input.id) {
        const [existing] = await deps.db
          .select({ encryptedCredentials: redisInstances.encryptedCredentials })
          .from(redisInstances)
          .where(eq(redisInstances.id, input.id))
          .limit(1);

        if (!existing) {
          throw new Error("Redis instance not found");
        }

        password =
          deps.encryption.decrypt(
            existing.encryptedCredentials as EncryptedEnvelope,
          ) || undefined;
      }

      return testRedisConnection({
        ...toConnectionInput(input),
        password: password || undefined,
      });
    },

    async update(actor: Actor, input: RedisInstanceInput & { id: string }) {
      await assertRedisInstanceAccess(deps.db, actor.userId, input.id, "admin");

      const [existing] = await deps.db
        .select()
        .from(redisInstances)
        .where(eq(redisInstances.id, input.id))
        .limit(1);

      if (!existing) {
        throw new Error("Redis instance not found");
      }

      const workspaceId = await resolveWorkspaceId(existing.environmentId);

      logger.info({ redisInstanceId: input.id }, "Updating redis instance");

      await deps.realtime.unregisterInstance(input.id);

      const password =
        input.password !== undefined && input.password !== ""
          ? input.password
          : deps.encryption.decrypt(
              existing.encryptedCredentials as EncryptedEnvelope,
            );

      const encryptedCredentials =
        input.password !== undefined && input.password !== ""
          ? deps.encryption.encrypt(input.password)
          : (existing.encryptedCredentials as EncryptedEnvelope);

      const updatedRow: RedisInstanceRow = {
        ...existing,
        nickname: input.nickname,
        host: input.host,
        port: input.port,
        username: input.username ?? null,
        db: resolveDb(input.db),
        tls: input.tls,
        tlsServername: input.tlsServername ?? null,
        bullmqPrefix: input.bullmqPrefix,
        encryptedCredentials,
        status: "disconnected",
        lastError: null,
        updatedAt: new Date(),
      };

      await deps.db
        .update(redisInstances)
        .set({
          nickname: updatedRow.nickname,
          host: updatedRow.host,
          port: updatedRow.port,
          username: updatedRow.username,
          db: updatedRow.db,
          tls: updatedRow.tls,
          tlsServername: updatedRow.tlsServername,
          bullmqPrefix: updatedRow.bullmqPrefix,
          encryptedCredentials,
          status: "disconnected",
          lastError: null,
        })
        .where(eq(redisInstances.id, input.id));

      try {
        await deps.realtime.registerInstance(
          toRealtimeConfig(updatedRow, workspaceId, password || undefined),
        );

        await deps.db
          .update(redisInstances)
          .set({
            status: "connected",
            lastConnectedAt: new Date(),
            lastError: null,
          })
          .where(eq(redisInstances.id, input.id));

        logger.info({ redisInstanceId: input.id }, "Redis instance updated");

        return { ok: true as const };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Connection failed";

        await deps.db
          .update(redisInstances)
          .set({ status: "error", lastError: message })
          .where(eq(redisInstances.id, input.id));

        throw error;
      }
    },

    async delete(actor: Actor, id: string) {
      await assertRedisInstanceAccess(deps.db, actor.userId, id, "admin");

      logger.info({ redisInstanceId: id }, "Deleting redis instance");

      await deps.realtime.unregisterInstance(id);

      await deps.db
        .update(redisInstances)
        .set({ status: "disconnected", lastError: null })
        .where(eq(redisInstances.id, id));

      await deps.db.delete(redisInstances).where(eq(redisInstances.id, id));

      return { ok: true as const };
    },

    async getClients(
      actor: Actor,
      input: { redisInstanceId: string },
    ) {
      await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        input.redisInstanceId,
        "viewer",
      );

      if (!deps.realtime.hasInstance(input.redisInstanceId)) {
        return [];
      }

      const { connection } = deps.realtime.getConnection(input.redisInstanceId);
      const raw = await connection.call("CLIENT", "LIST") as string;

      return raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const fields: Record<string, string> = {};
          for (const part of line.split(" ")) {
            const eq = part.indexOf("=");
            if (eq !== -1) {
              fields[part.slice(0, eq)] = part.slice(eq + 1);
            }
          }
          return {
            id: fields["id"] ?? "",
            addr: fields["addr"] ?? "",
            name: fields["name"] || null,
            cmd: fields["cmd"] ?? "",
            age: fields["age"] ? parseInt(fields["age"], 10) : 0,
            idle: fields["idle"] ? parseInt(fields["idle"], 10) : 0,
            flags: fields["flags"] ?? "",
            db: fields["db"] ? parseInt(fields["db"], 10) : 0,
          };
        });
    },

    async getClientCounts(actor: Actor, environmentId: string) {
      await assertEnvironmentAccess(
        deps.db,
        actor.userId,
        environmentId,
        "viewer",
      );

      const rows = await deps.db
        .select({ id: redisInstances.id, nickname: redisInstances.nickname })
        .from(redisInstances)
        .where(eq(redisInstances.environmentId, environmentId));

      return Promise.all(
        rows.map(async ({ id, nickname }) => {
          try {
            if (!deps.realtime.hasInstance(id)) {
              return { id, nickname, connectedClients: null };
            }
            const { connection } = deps.realtime.getConnection(id);
            const info = await connection.info("clients");
            const match = /connected_clients:(\d+)/.exec(info);
            const connectedClients = match ? parseInt(match[1]!, 10) : null;
            return { id, nickname, connectedClients };
          } catch {
            return { id, nickname, connectedClients: null };
          }
        }),
      );
    },

    async bootstrapInstances() {
      const existing = deps.getBootstrapPromise();
      if (existing) {
        return existing;
      }

      const promise = (async () => {
        logger.info("Bootstrapping redis instances");

        const instances = await deps.db
          .select({
            instance: redisInstances,
            workspaceId: environments.workspaceId,
          })
          .from(redisInstances)
          .innerJoin(
            environments,
            eq(environments.id, redisInstances.environmentId),
          );

        await Promise.all(
          instances.map(async ({ instance, workspaceId }) => {
            try {
              const password = deps.encryption.decrypt(
                instance.encryptedCredentials as EncryptedEnvelope,
              );

              await deps.realtime.registerInstance(
                toRealtimeConfig(instance, workspaceId, password || undefined),
              );

              await deps.db
                .update(redisInstances)
                .set({
                  status: "connected",
                  lastConnectedAt: new Date(),
                  lastError: null,
                })
                .where(eq(redisInstances.id, instance.id));

              logger.info(
                { redisInstanceId: instance.id },
                "Bootstrapped redis instance",
              );
            } catch (error) {
              logger.error(
                { error, redisInstanceId: instance.id },
                "Failed to bootstrap redis instance",
              );

              await deps.db
                .update(redisInstances)
                .set({
                  status: "error",
                  lastError:
                    error instanceof Error ? error.message : "Connection failed",
                })
                .where(eq(redisInstances.id, instance.id));
            }
          }),
        );
      })();

      deps.setBootstrapPromise(promise);

      try {
        await promise;
      } finally {
        deps.setBootstrapPromise(null);
      }
    },
  };
}

export type RedisService = ReturnType<typeof createRedisService>;
