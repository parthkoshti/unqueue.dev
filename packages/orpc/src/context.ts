import type { Database } from "@unqueue/db";
import type { Logger } from "@unqueue/logger";
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
