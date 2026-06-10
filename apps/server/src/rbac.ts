import { and, eq } from "drizzle-orm";
import type { Database } from "@unstall/db";
import { environments, workspaceMembers } from "@unstall/db/schema";
import type { Role } from "@unstall/shared";
import { hasMinimumRole } from "@unstall/shared";

export async function getMembership(
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<{ role: Role } | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function assertWorkspaceAccess(
  db: Database,
  userId: string,
  workspaceId: string,
  minimumRole: Role = "viewer",
): Promise<Role> {
  const membership = await getMembership(db, userId, workspaceId);
  if (!membership || !hasMinimumRole(membership.role, minimumRole)) {
    throw new Error("FORBIDDEN");
  }
  return membership.role;
}

export async function getWorkspaceIdForEnvironment(
  db: Database,
  environmentId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ workspaceId: environments.workspaceId })
    .from(environments)
    .where(eq(environments.id, environmentId))
    .limit(1);
  return row?.workspaceId ?? null;
}
