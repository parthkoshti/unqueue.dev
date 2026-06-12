import { createFileRoute, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";
import { AppShellSkeleton } from "@/components/app-sidebar-skeleton";

export const Route = createFileRoute("/")({
  pendingComponent: AppShellSkeleton,
  loader: async ({ context }: { context: { queryClient: QueryClient } }) => {
    const workspaces = await context.queryClient.ensureQueryData({
      queryKey: ["workspaces"],
      queryFn: () => rpcClient.workspace.list(),
    });
    const first = workspaces[0];
    if (!first) throw redirect({ to: "/login" });

    setWorkspaceId(first.id);
    const envs = await context.queryClient.ensureQueryData({
      queryKey: ["environments", first.id],
      queryFn: () => rpcClient.environment.list({ workspaceId: first.id }),
    });
    const environmentId = resolveEnvironmentId(first.id, envs);
    if (!environmentId) throw redirect({ to: "/login" });

    throw redirect({
      to: "/$workspaceId/$environmentId",
      params: { workspaceId: first.id, environmentId },
    });
  },
});
