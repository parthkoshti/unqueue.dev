import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import type { Logger } from "@unstall/logger";

const isDev = process.env.NODE_ENV !== "production";

export function createRpcHandlerPlugins(logger: Logger) {
  const rpcLogger = logger.child(
    { component: "rpc" },
    isDev ? { level: "warn" } : undefined,
  );

  return [
    new LoggingHandlerPlugin({
      logger: rpcLogger,
      logRequestResponse: !isDev,
      logRequestAbort: !isDev,
    }),
  ];
}

export const isRpcVerboseLoggingEnabled = !isDev;
