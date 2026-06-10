import {
  createId,
  DEFAULT_ENVIRONMENT_NAME,
  DEFAULT_ENVIRONMENT_NAMES,
} from "@unqueue/shared";
import type { Database } from "@unqueue/db";
import { environments, workspaceMembers, workspaces } from "@unqueue/db/schema";

export async function bootstrapWorkspace(
  db: Database,
  userId: string,
  userName: string,
) {
  const workspaceId = createId();
  const memberId = createId();

  const defaultEnvironments = DEFAULT_ENVIRONMENT_NAMES.map((name) => ({
    id: createId(),
    workspaceId,
    name,
  }));

  const defaultEnvironment = defaultEnvironments.find(
    (environment) => environment.name === DEFAULT_ENVIRONMENT_NAME,
  );

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

  await db.insert(environments).values(defaultEnvironments);

  return {
    workspaceId,
    environmentId: defaultEnvironment?.id ?? defaultEnvironments[0]!.id,
  };
}
