import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { parseRouteParamsFromPathname } from "@/lib/parse-route-params";
import { resolveEnvironmentId } from "@/lib/resolve-environment";
import { sessionQueryOptions } from "@/lib/session-query";
import type { Role } from "@unqueue/shared";

export function useShellContext() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { workspaceId: workspaceIdFromParams, environmentId: environmentIdFromParams } =
    parseRouteParamsFromPathname(pathname);

  const sessionQuery = useQuery(sessionQueryOptions());

  const isAuthed = !!sessionQuery.data?.data?.user;

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
    enabled: isAuthed,
  });

  const workspaceId =
    workspaceIdFromParams ?? workspacesQuery.data?.[0]?.id ?? undefined;

  const workspaceRole = workspacesQuery.data?.find((w) => w.id === workspaceId)
    ?.role as Role | undefined;

  useEffect(() => {
    if (workspaceId) {
      setWorkspaceId(workspaceId);
    }
  }, [workspaceId]);

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId: workspaceId! }),
    enabled: isAuthed && !!workspaceId,
  });

  const environmentId =
    environmentIdFromParams ??
    (workspaceId && envsQuery.data
      ? resolveEnvironmentId(workspaceId, envsQuery.data)
      : undefined);

  const hasNavigationContext = !!workspaceId && !!environmentId;

  return {
    isAuthed,
    workspaceId,
    environmentId,
    workspaceRole,
    hasNavigationContext,
    isResolvingContext:
      isAuthed &&
      (workspacesQuery.isLoading ||
        (!!workspaceId && !environmentIdFromParams && envsQuery.isLoading)),
  };
}
