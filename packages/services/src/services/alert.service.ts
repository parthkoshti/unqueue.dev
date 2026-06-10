import { eq } from "drizzle-orm";
import { createId } from "@unqueue/shared";
import type { AlertCondition } from "@unqueue/validators";
import { alertEvents, alerts } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import { forbidden } from "../errors.js";
import {
  assertEnvironmentAccess,
  assertRedisInstanceAccess,
} from "../rbac.js";
import type { Actor } from "../types.js";

export function createAlertService(deps: ServiceDeps, logger: Logger) {
  return {
    async list(actor: Actor, environmentId: string) {
      await assertEnvironmentAccess(
        deps.db,
        actor.userId,
        environmentId,
        "viewer",
      );
      logger.debug({ environmentId }, "Listing alerts");

      return deps.db
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
        .where(eq(alerts.environmentId, environmentId));
    },

    async create(
      actor: Actor,
      input: {
        environmentId: string;
        redisInstanceId: string;
        name: string;
        queueName: string;
        webhookUrl: string;
        condition: AlertCondition;
        intervalMinutes: number;
        cooldownMinutes: number;
      },
    ) {
      const instance = await assertRedisInstanceAccess(
        deps.db,
        actor.userId,
        input.redisInstanceId,
        "member",
      );

      if (instance.environmentId !== input.environmentId) {
        forbidden("Environment mismatch");
      }

      const id = createId();

      logger.info(
        {
          environmentId: input.environmentId,
          alertId: id,
          queueName: input.queueName,
        },
        "Creating alert",
      );

      await deps.db.insert(alerts).values({
        id,
        environmentId: input.environmentId,
        redisInstanceId: input.redisInstanceId,
        name: input.name,
        queueName: input.queueName,
        config: { condition: input.condition },
        encryptedWebhook: deps.encryption.encrypt(input.webhookUrl),
        intervalMinutes: input.intervalMinutes,
        cooldownMinutes: input.cooldownMinutes,
      });

      const [alert] = await deps.db
        .select()
        .from(alerts)
        .where(eq(alerts.id, id))
        .limit(1);

      if (alert) {
        deps.alerts.scheduleAlert(alert);
      }

      return { id };
    },

    async delete(id: string) {
      logger.info({ alertId: id }, "Deleting alert");

      deps.alerts.stopAlert(id);
      await deps.db.delete(alerts).where(eq(alerts.id, id));

      return { ok: true as const };
    },

    async listEvents(alertId: string) {
      logger.debug({ alertId }, "Listing alert events");

      return deps.db
        .select()
        .from(alertEvents)
        .where(eq(alertEvents.alertId, alertId));
    },
  };
}

export type AlertService = ReturnType<typeof createAlertService>;
