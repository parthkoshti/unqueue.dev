import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }

    const workspaces = await rpcClient.workspace.list();
    const first = workspaces[0];
    if (!first) throw redirect({ to: "/login" });

    setWorkspaceId(first.id);
    const envs = await rpcClient.environment.list({ workspaceId: first.id });
    const environmentId = resolveEnvironmentId(first.id, envs);
    if (!environmentId) throw redirect({ to: "/login" });

    throw redirect({
      to: "/$workspaceId/$environmentId",
      params: { workspaceId: first.id, environmentId },
    });
  },
});
