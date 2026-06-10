import { z } from "zod";

export const redisInstanceInputSchema = z.object({
  nickname: z.string().min(1).max(100),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  db: z.number().int().min(0).max(15).default(0),
  tls: z.boolean().default(false),
  tlsServername: z.string().optional(),
  bullmqPrefix: z.string().min(1).default("bull"),
});
