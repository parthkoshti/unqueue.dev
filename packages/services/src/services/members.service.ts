import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { createId, type Role } from "@unstall/shared";
import { users, workspaceInvites, workspaceMembers } from "@unstall/db/schema";
import type { Logger } from "@unstall/logger";
import type { ServiceDeps } from "../context.js";
import type { Actor } from "../types.js";
import { forbidden, notFound } from "../errors.js";
import { assertWorkspaceAccess } from "../rbac.js";

const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function isAssignableRole(role: Role): role is AssignableRole {
  return ASSIGNABLE_ROLES.includes(role as AssignableRole);
}

function canManageMemberRole(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === "owner") return false;
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    return targetRole === "member" || targetRole === "viewer";
  }
  return false;
}

function canAssignRole(actorRole: Role, role: Role): boolean {
  if (!isAssignableRole(role)) return false;
  return canManageMemberRole(actorRole, role);
}

export function createMembersService(deps: ServiceDeps, logger: Logger) {
  return {
    async list(workspaceId: string) {
      logger.debug({ workspaceId }, "Listing workspace members");

      return deps.db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: workspaceMembers.role,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, workspaceId));
    },

    async listInvites(workspaceId: string) {
      logger.debug({ workspaceId }, "Listing workspace invites");

      return deps.db
        .select({
          id: workspaceInvites.id,
          email: workspaceInvites.email,
          role: workspaceInvites.role,
          expiresAt: workspaceInvites.expiresAt,
          createdAt: workspaceInvites.createdAt,
        })
        .from(workspaceInvites)
        .where(
          and(
            eq(workspaceInvites.workspaceId, workspaceId),
            isNull(workspaceInvites.acceptedAt),
            gt(workspaceInvites.expiresAt, new Date()),
          ),
        );
    },

    async invite(input: {
      workspaceId: string;
      email: string;
      role: Role;
      invitedBy: string;
    }) {
      logger.info(
        { workspaceId: input.workspaceId, email: input.email, role: input.role },
        "Creating workspace invite",
      );

      if (!isAssignableRole(input.role)) {
        forbidden("Cannot invite with this role");
      }

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const id = createId();

      await deps.db.insert(workspaceInvites).values({
        id,
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: input.invitedBy,
      });

      return {
        id,
        inviteUrl: `${deps.platformUrl}/invite/${token}`,
      };
    },

    async updateRole(actor: Actor, memberId: string, role: Role) {
      const actorRole = await assertWorkspaceAccess(
        deps.db,
        actor.userId,
        actor.membership!.workspaceId,
        "admin",
      );

      if (!canAssignRole(actorRole, role)) {
        forbidden("Cannot assign this role");
      }

      const [member] = await deps.db
        .select({
          id: workspaceMembers.id,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          workspaceId: workspaceMembers.workspaceId,
        })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId))
        .limit(1);

      if (!member || member.workspaceId !== actor.membership!.workspaceId) {
        notFound("Member");
      }

      if (!canManageMemberRole(actorRole, member.role)) {
        forbidden("Cannot update this member");
      }

      await deps.db
        .update(workspaceMembers)
        .set({ role })
        .where(eq(workspaceMembers.id, memberId));

      logger.info({ memberId, role }, "Updated workspace member role");

      return { ok: true as const };
    },

    async remove(actor: Actor, memberId: string) {
      const actorRole = await assertWorkspaceAccess(
        deps.db,
        actor.userId,
        actor.membership!.workspaceId,
        "admin",
      );

      const [member] = await deps.db
        .select({
          id: workspaceMembers.id,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          workspaceId: workspaceMembers.workspaceId,
        })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId))
        .limit(1);

      if (!member || member.workspaceId !== actor.membership!.workspaceId) {
        notFound("Member");
      }

      if (member.userId === actor.userId) {
        forbidden("Cannot remove yourself");
      }

      if (!canManageMemberRole(actorRole, member.role)) {
        forbidden("Cannot remove this member");
      }

      await deps.db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId));

      logger.info({ memberId }, "Removed workspace member");

      return { ok: true as const };
    },

    async updateInvite(actor: Actor, inviteId: string, role: Role) {
      const actorRole = await assertWorkspaceAccess(
        deps.db,
        actor.userId,
        actor.membership!.workspaceId,
        "admin",
      );

      if (!canAssignRole(actorRole, role)) {
        forbidden("Cannot assign this role");
      }

      const [invite] = await deps.db
        .select()
        .from(workspaceInvites)
        .where(eq(workspaceInvites.id, inviteId))
        .limit(1);

      if (!invite || invite.workspaceId !== actor.membership!.workspaceId) {
        notFound("Invite");
      }

      if (invite.acceptedAt || invite.expiresAt < new Date()) {
        forbidden("Invite is no longer pending");
      }

      if (!canManageMemberRole(actorRole, invite.role)) {
        forbidden("Cannot update this invite");
      }

      await deps.db
        .update(workspaceInvites)
        .set({ role })
        .where(eq(workspaceInvites.id, inviteId));

      logger.info({ inviteId, role }, "Updated workspace invite role");

      return { ok: true as const };
    },

    async revokeInvite(actor: Actor, inviteId: string) {
      const actorRole = await assertWorkspaceAccess(
        deps.db,
        actor.userId,
        actor.membership!.workspaceId,
        "admin",
      );

      const [invite] = await deps.db
        .select()
        .from(workspaceInvites)
        .where(eq(workspaceInvites.id, inviteId))
        .limit(1);

      if (!invite || invite.workspaceId !== actor.membership!.workspaceId) {
        notFound("Invite");
      }

      if (invite.acceptedAt) {
        forbidden("Invite already accepted");
      }

      if (!canManageMemberRole(actorRole, invite.role)) {
        forbidden("Cannot revoke this invite");
      }

      await deps.db
        .delete(workspaceInvites)
        .where(eq(workspaceInvites.id, inviteId));

      logger.info({ inviteId }, "Revoked workspace invite");

      return { ok: true as const };
    },
  };
}

export type MembersService = ReturnType<typeof createMembersService>;
