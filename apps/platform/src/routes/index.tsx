import { createFileRoute, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";
import { sessionQueryOptions } from "@/lib/session-query";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }: { context: { queryClient: QueryClient } }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (!session?.data?.user) {
      throw redirect({ to: "/login" });
    }

    const workspaces = await context.queryClient.fetchQuery({
      queryKey: ["workspaces"],
      queryFn: () => rpcClient.workspace.list(),
    });
    const first = workspaces[0];
    if (!first) throw redirect({ to: "/login" });

    setWorkspaceId(first.id);
    const envs = await context.queryClient.fetchQuery({
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
