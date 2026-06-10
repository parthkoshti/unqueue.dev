const PREFERRED_ENV_PREFIX = "unstall-preferred-env";

function preferredEnvKey(workspaceId: string) {
  return `${PREFERRED_ENV_PREFIX}:${workspaceId}`;
}

export function getPreferredEnvironmentId(workspaceId: string): string | null {
  try {
    return localStorage.getItem(preferredEnvKey(workspaceId));
  } catch {
    return null;
  }
}

export function setPreferredEnvironmentId(
  workspaceId: string,
  environmentId: string,
) {
  try {
    localStorage.setItem(preferredEnvKey(workspaceId), environmentId);
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}
