import { eq } from "drizzle-orm";
import { workspaceMembers, workspaces } from "@unstall/db/schema";
import type { Logger } from "@unstall/logger";
import type { ServiceDeps } from "../context.js";
import { notFound } from "../errors.js";
import type { Actor } from "../types.js";

export function createWorkspaceService(deps: ServiceDeps, logger: Logger) {
  return {
    async list(actor: Actor) {
      logger.debug({ userId: actor.userId }, "Listing workspaces");

      return deps.db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          role: workspaceMembers.role,
          createdAt: workspaces.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, actor.userId));
    },

    async get(_actor: Actor, workspaceId: string) {
      logger.debug({ workspaceId }, "Getting workspace");

      const [workspace] = await deps.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) notFound("Workspace");
      return workspace;
    },
  };
}

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;
