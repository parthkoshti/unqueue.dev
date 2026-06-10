import { eq } from "drizzle-orm";
import type { RedisInstanceConfig } from "@unstall/bullmq";
import { environments, redisInstances } from "@unstall/db/schema";
import type { EncryptedEnvelope } from "@unstall/shared";
import type { Logger } from "@unstall/logger";
import type { RedisInstanceRegistryDeps } from "./context.js";
import { notFound } from "./errors.js";

function toRealtimeConfig(
  instance: typeof redisInstances.$inferSelect,
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

export function createRedisInstanceRegistry(
  deps: RedisInstanceRegistryDeps,
  logger: Logger,
) {
  const ensuring = new Map<string, Promise<void>>();

  async function doRegister(
    redisInstanceId: string,
    getData: () => Promise<{
      instance: typeof redisInstances.$inferSelect;
      workspaceId: string;
    } | null>,
  ): Promise<void> {
    if (deps.realtime.hasInstance(redisInstanceId)) return;

    await deps.realtime.awaitRegistration(redisInstanceId);
    if (deps.realtime.hasInstance(redisInstanceId)) return;

    const pending = ensuring.get(redisInstanceId);
    if (pending) return pending;

    const promise = (async () => {
      if (deps.realtime.hasInstance(redisInstanceId)) return;

      const row = await getData();
      if (!row) notFound("Redis connection");

      if (deps.realtime.hasInstance(redisInstanceId)) return;

      logger.info({ redisInstanceId }, "Lazy-registering redis instance after server restart");

      const password = deps.encryption.decrypt(
        row.instance.encryptedCredentials as EncryptedEnvelope,
      );

      await deps.realtime.registerInstance(
        toRealtimeConfig(row.instance, row.workspaceId, password || undefined),
      );
    })();

    ensuring.set(redisInstanceId, promise);
    try {
      await promise;
    } finally {
      ensuring.delete(redisInstanceId);
    }
  }

  return {
    async ensureRegistered(redisInstanceId: string): Promise<void> {
      return doRegister(redisInstanceId, async () => {
        const [row] = await deps.db
          .select({ instance: redisInstances, workspaceId: environments.workspaceId })
          .from(redisInstances)
          .innerJoin(environments, eq(environments.id, redisInstances.environmentId))
          .where(eq(redisInstances.id, redisInstanceId))
          .limit(1);
        return row ?? null;
      });
    },

    async ensureRegisteredWithData(data: {
      instance: typeof redisInstances.$inferSelect;
      workspaceId: string;
    }): Promise<void> {
      return doRegister(data.instance.id, async () => data);
    },
  };
}

export type RedisInstanceRegistry = ReturnType<typeof createRedisInstanceRegistry>;
