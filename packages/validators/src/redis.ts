import { z } from "zod";

export const redisInstanceInputSchema = z.object({
  nickname: z.string().min(1).max(100),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  password: z.string().optional(),
  tls: z.boolean().default(false),
  bullmqPrefix: z.string().min(1).default("bull"),
});
