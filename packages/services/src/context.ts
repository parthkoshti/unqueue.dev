import type { Database } from "@unstall/db";
import type { Logger } from "@unstall/logger";
import type { EncryptionService } from "./encryption.js";
import type { AlertScheduler } from "./ports/alerts.js";
import type { RealtimeGateway } from "./ports/realtime.js";

export type RedisInstanceRegistryDeps = Pick<
  ServiceDeps,
  "db" | "logger" | "encryption" | "realtime" | "getBootstrapPromise"
>;

export type ServiceDeps = {
  db: Database;
  logger: Logger;
  platformUrl: string;
  encryption: EncryptionService;
  realtime: RealtimeGateway;
  alerts: AlertScheduler;
  redisInstances: import("./redis-instance-registry.js").RedisInstanceRegistry;
  getBootstrapPromise: () => Promise<void> | null;
  setBootstrapPromise: (promise: Promise<void> | null) => void;
};
