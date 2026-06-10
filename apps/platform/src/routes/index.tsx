import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { rpcClient, setWorkspaceId } from "@/lib/api";

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
    const env = envs[0];
    if (!env) throw redirect({ to: "/login" });

    throw redirect({
      to: "/$workspaceId/$environmentId",
      params: { workspaceId: first.id, environmentId: env.id },
    });
  },
});
