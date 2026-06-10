import type { Database } from "@unstall/db";
import type { Logger } from "@unstall/logger";
import type { Role } from "@unstall/shared";

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
