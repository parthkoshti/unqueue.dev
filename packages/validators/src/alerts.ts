import { z } from "zod";

export const alertConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("failure_rate"),
    threshold: z.number().min(0).max(1),
    windowMinutes: z.number().int().min(1).max(1440),
  }),
  z.object({
    type: z.literal("stalled"),
    minStalledJobs: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("queue_lag"),
    maxLagMs: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("waiting_jobs"),
    threshold: z.number().int().min(1),
  }),
]);

export const alertConfigSchema = z.object({
  condition: alertConditionSchema,
});

export type AlertCondition = z.infer<typeof alertConditionSchema>;
