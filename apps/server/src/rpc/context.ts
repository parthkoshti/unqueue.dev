import type { Services } from "@unqueue/services";
import type { LoggerContext } from "@orpc/experimental-pino";
import type { ORPCContext } from "@unqueue/orpc";

export type ServerContext = ORPCContext &
  LoggerContext & {
    services: Services;
  };
