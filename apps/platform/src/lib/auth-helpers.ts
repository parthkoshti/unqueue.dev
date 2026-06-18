import type { QueryClient } from "@tanstack/react-query";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";
import { sessionQueryOptions } from "@/lib/session-query";

export function getPlatformUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function authCallbackUrl(path = "/verify-email") {
  return `${getPlatformUrl()}${path}`;
}

export function safeRedirectPath(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function refreshSession(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["session"] });
  return queryClient.fetchQuery(sessionQueryOptions());
}

export async function resolveAuthenticatedLanding(queryClient: QueryClient) {
  const workspaces = await queryClient.ensureQueryData({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
  });
  const first = workspaces[0];
  if (!first) return null;

  setWorkspaceId(first.id);
  const envs = await queryClient.ensureQueryData({
    queryKey: ["environments", first.id],
    queryFn: () => rpcClient.environment.list({ workspaceId: first.id }),
  });
  const environmentId = resolveEnvironmentId(first.id, envs);
  if (!environmentId) return null;

  return {
    to: "/$workspaceId/$environmentId" as const,
    params: { workspaceId: first.id, environmentId },
  };
}
