import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { createId } from "@unqueue/shared";
import { workspaceInvites, workspaceMembers } from "@unqueue/db/schema";
import type { Logger } from "@unqueue/logger";
import type { ServiceDeps } from "../context.js";
import { forbidden, notFound } from "../errors.js";

export function createInviteService(deps: ServiceDeps, logger: Logger) {
  return {
    async accept(input: { token: string; userId: string }) {
      logger.info({ userId: input.userId }, "Accepting workspace invite");

      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const [invite] = await deps.db
        .select()
        .from(workspaceInvites)
        .where(eq(workspaceInvites.tokenHash, tokenHash))
        .limit(1);

      if (!invite || invite.acceptedAt) notFound("Invite");
      if (invite.expiresAt < new Date()) forbidden("Invite expired");

      await deps.db.insert(workspaceMembers).values({
        id: createId(),
        workspaceId: invite.workspaceId,
        userId: input.userId,
        role: invite.role,
      });

      await deps.db
        .update(workspaceInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(workspaceInvites.id, invite.id));

      logger.info(
        { userId: input.userId, workspaceId: invite.workspaceId },
        "Workspace invite accepted",
      );

      return { workspaceId: invite.workspaceId };
    },
  };
}

export type InviteService = ReturnType<typeof createInviteService>;
