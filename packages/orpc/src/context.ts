import type { LoggerContext } from "@orpc/experimental-pino";
import type { Database } from "@unqueue/db";
import type { Logger } from "@unqueue/logger";
import type { Services } from "@unqueue/services";
import type { Role } from "@unqueue/shared";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type ORPCContext = {
  db: Database;
  logger: Logger;
  user: SessionUser | null;
  membership?: {
    workspaceId: string;
    role: Role;
  };
};

export type ServerContext = ORPCContext &
  LoggerContext & {
    services: Services;
  };
