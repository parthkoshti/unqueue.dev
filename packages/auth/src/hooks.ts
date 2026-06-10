import { createId } from "@unstall/shared";
import type { Database } from "@unstall/db";
import { environments, workspaceMembers, workspaces } from "@unstall/db/schema";

export async function bootstrapWorkspace(
  db: Database,
  userId: string,
  userName: string,
) {
  const workspaceId = createId();
  const environmentId = createId();
  const memberId = createId();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: `${userName}'s Workspace`,
  });

  await db.insert(workspaceMembers).values({
    id: memberId,
    workspaceId,
    userId,
    role: "owner",
  });

  await db.insert(environments).values({
    id: environmentId,
    workspaceId,
    name: "Production",
  });

  return { workspaceId, environmentId };
}
