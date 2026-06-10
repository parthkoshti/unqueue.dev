import type { alerts } from "@unstall/db/schema";

export type AlertRow = typeof alerts.$inferSelect;

export type AlertScheduler = {
  scheduleAlert(alert: AlertRow): void;
  stopAlert(alertId: string): void;
};
