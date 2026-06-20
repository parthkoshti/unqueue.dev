import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@unqueue/db";
import { alertEvents, alerts } from "@unqueue/db/schema";
import type { AlertCondition } from "@unqueue/validators";
import { evaluateCondition } from "./conditions.js";
import { createId } from "@unqueue/shared";
import type { Logger } from "@unqueue/logger";
import type { MetricsAggregator } from "@unqueue/bullmq";
import { createEncryptionService, type EncryptionService } from "@unqueue/services";
import type { EncryptedEnvelope } from "@unqueue/shared";

type AlertRow = typeof alerts.$inferSelect;

export class AlertEngine {
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private encryption: EncryptionService;

  constructor(
    private db: Database,
    private metrics: MetricsAggregator,
    private logger: Logger,
    encryptionKeys: string,
  ) {
    this.encryption = createEncryptionService(encryptionKeys);
  }

  async start(): Promise<void> {
    const rows = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.enabled, true));

    for (const alert of rows) {
      this.scheduleAlert(alert);
    }
  }

  scheduleAlert(alert: AlertRow): void {
    this.stopAlert(alert.id);
    const intervalMs = alert.intervalMinutes * 60 * 1000;
    const timer = setInterval(() => void this.evaluate(alert.id), intervalMs);
    this.timers.set(alert.id, timer);
  }

  stopAlert(alertId: string): void {
    const timer = this.timers.get(alertId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(alertId);
    }
  }

  async reload(): Promise<void> {
    for (const id of this.timers.keys()) {
      this.stopAlert(id);
    }
    await this.start();
  }

  private async evaluate(alertId: string): Promise<void> {
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1);

    if (!alert || !alert.enabled) return;

    const config = alert.config as { condition: AlertCondition };
    const metrics = this.metrics.getMetrics(
      alert.redisInstanceId,
      alert.queueName,
    );

    const triggered = evaluateCondition(config.condition, metrics);
    const [lastEvent] = await this.db
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.alertId, alert.id),
          eq(alertEvents.status, "fired"),
        ),
      )
      .orderBy(desc(alertEvents.firedAt))
      .limit(1);

    const inCooldown =
      lastEvent &&
      Date.now() - lastEvent.firedAt.getTime() <
        alert.cooldownMinutes * 60 * 1000;

    if (triggered && !inCooldown) {
      await this.fire(alert, config.condition, metrics);
    } else if (!triggered && lastEvent && !lastEvent.resolvedAt) {
      await this.resolve(alert.id, lastEvent.id);
    }
  }

  private async fire(
    alert: AlertRow,
    condition: AlertCondition,
    metrics: unknown,
  ): Promise<void> {
    const webhook = this.encryption.decrypt(
      alert.encryptedWebhook as EncryptedEnvelope,
    );

    const embed = {
      title: `Alert: ${alert.name}`,
      description: `Queue **${alert.queueName}** triggered condition **${condition.type}**`,
      color: 0xe74c3c,
      fields: [
        { name: "Condition", value: JSON.stringify(condition), inline: false },
        { name: "Metrics", value: JSON.stringify(metrics).slice(0, 1000), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    const body = (await response.json().catch(() => ({}))) as { id?: string };

    await this.db.insert(alertEvents).values({
      id: createId(),
      alertId: alert.id,
      status: "fired",
      conditionSnapshot: { condition, metrics },
      discordMessageId: body.id ?? null,
      firedAt: new Date(),
    });

    this.logger.info({ alertId: alert.id }, "Alert fired");
  }

  private async resolve(alertId: string, eventId: string): Promise<void> {
    const { eq: eqOp } = await import("drizzle-orm");
    await this.db
      .update(alertEvents)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eqOp(alertEvents.id, eventId));

    await this.db.insert(alertEvents).values({
      id: createId(),
      alertId,
      status: "resolved",
      conditionSnapshot: {},
      firedAt: new Date(),
      resolvedAt: new Date(),
    });
  }
}

export { evaluateCondition } from "./conditions.js";
