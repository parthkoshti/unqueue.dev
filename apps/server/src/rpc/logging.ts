import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import type { StandardHandlerPlugin } from "@orpc/server/standard";
import type { Logger } from "@unqueue/logger";
import type { ServerContext } from "./context.js";

const isDev = process.env.NODE_ENV !== "production";

export function createRpcHandlerPlugins(
  logger: Logger,
): StandardHandlerPlugin<ServerContext>[] {
  const rpcLogger = logger.child(
    { component: "rpc" },
    isDev ? { level: "warn" } : undefined,
  );

  return [
    new LoggingHandlerPlugin<ServerContext>({
      logger: rpcLogger,
      logRequestResponse: !isDev,
      logRequestAbort: !isDev,
    }),
  ];
}

export const isRpcVerboseLoggingEnabled = !isDev;
