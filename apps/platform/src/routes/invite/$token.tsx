import { createFileRoute, redirect } from "@tanstack/react-router";
import { rpcClient } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";
import { sessionQueryOptions } from "@/lib/session-query";

export const Route = createFileRoute("/invite/$token")({
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (!session.data?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: `/invite/${params.token}` },
      });
    }
  },
  pendingComponent: () => (
    <div className="flex min-h-svh items-center justify-center p-4 text-sm text-muted-foreground">
      Accepting invite...
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-svh items-center justify-center p-4 text-sm">
      {error instanceof Error ? error.message : "Could not accept this invite."}
    </div>
  ),
  loader: async ({ params }) => {
    const result = await rpcClient.invite.accept({ token: params.token });
    const envs = await rpcClient.environment.list({ workspaceId: result.workspaceId });
    const environmentId = resolveEnvironmentId(result.workspaceId, envs);
    if (!environmentId) throw new Error("This workspace does not have an environment yet.");

    throw redirect({
      to: "/$workspaceId/$environmentId",
      params: { workspaceId: result.workspaceId, environmentId },
    });
  },
  component: () => null,
});
