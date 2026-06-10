import type { Database } from "@unstall/db";
import type { Logger } from "@unstall/logger";
import type { Role } from "@unstall/shared";
import type { ORPCContext } from "@unstall/orpc";
import type { RealtimeManager } from "../realtime/manager.js";
import type { AlertEngine } from "../alerts/engine.js";

export type ServerContext = ORPCContext & {
  realtime: RealtimeManager;
  alertEngine: AlertEngine;
};

export type { Role };
