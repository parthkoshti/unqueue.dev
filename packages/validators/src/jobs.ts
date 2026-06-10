import { z } from "zod";

export const jobProgressSchema = z.object({
  currentStep: z.string().optional(),
  percent: z.number().min(0).max(100).optional(),
  steps: z
    .array(
      z.object({
        name: z.string(),
        status: z.enum(["pending", "active", "completed", "failed"]),
      }),
    )
    .optional(),
});

export const jobLogSchema = z.object({
  v: z.number().optional(),
  ts: z.number(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type JobProgress = z.infer<typeof jobProgressSchema>;
export type JobLog = z.infer<typeof jobLogSchema>;
