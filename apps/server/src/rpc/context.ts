import type { Services } from "@unstall/services";
import type { LoggerContext } from "@orpc/experimental-pino";
import type { ORPCContext } from "@unstall/orpc";

export type ServerContext = ORPCContext &
  LoggerContext & {
    services: Services;
  };
