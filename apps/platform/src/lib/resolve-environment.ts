import { DEFAULT_ENVIRONMENT_NAME } from "@unqueue/shared";
import { getPreferredEnvironmentId } from "@/lib/preferences";

type EnvironmentRef = {
  id: string;
  name: string;
};

export function resolveEnvironmentId(
  workspaceId: string,
  environments: EnvironmentRef[],
): string | undefined {
  if (environments.length === 0) return undefined;

  const preferredId = getPreferredEnvironmentId(workspaceId);
  if (preferredId && environments.some((environment) => environment.id === preferredId)) {
    return preferredId;
  }

  const defaultEnvironment = environments.find(
    (environment) =>
      environment.name.toLowerCase() === DEFAULT_ENVIRONMENT_NAME,
  );
  if (defaultEnvironment) return defaultEnvironment.id;

  return environments[0]?.id;
}
