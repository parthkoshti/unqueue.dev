import { and, eq } from "drizzle-orm";
import type { Database } from "@unstall/db";
import { environments, redisInstances, workspaceMembers } from "@unstall/db/schema";
import type { Role } from "@unstall/shared";
import { hasMinimumRole } from "@unstall/shared";
import { forbidden, notFound } from "./errors.js";

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
    forbidden();
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

export async function assertEnvironmentAccess(
  db: Database,
  userId: string,
  environmentId: string,
  minimumRole: Role = "viewer",
): Promise<{ workspaceId: string; role: Role }> {
  const [row] = await db
    .select({
      workspaceId: environments.workspaceId,
      role: workspaceMembers.role,
    })
    .from(environments)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, environments.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(environments.id, environmentId))
    .limit(1);

  if (!row) {
    notFound("Environment");
  }

  if (!hasMinimumRole(row.role, minimumRole)) {
    forbidden();
  }

  return { workspaceId: row.workspaceId, role: row.role };
}

export async function assertRedisInstanceAccess(
  db: Database,
  userId: string,
  redisInstanceId: string,
  minimumRole: Role = "viewer",
): Promise<{ workspaceId: string; environmentId: string; role: Role }> {
  const [row] = await db
    .select({
      environmentId: redisInstances.environmentId,
      workspaceId: environments.workspaceId,
      role: workspaceMembers.role,
    })
    .from(redisInstances)
    .innerJoin(environments, eq(environments.id, redisInstances.environmentId))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, environments.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(redisInstances.id, redisInstanceId))
    .limit(1);

  if (!row) {
    notFound("Redis connection");
  }

  if (!hasMinimumRole(row.role, minimumRole)) {
    forbidden();
  }

  return {
    workspaceId: row.workspaceId,
    environmentId: row.environmentId,
    role: row.role,
  };
}
