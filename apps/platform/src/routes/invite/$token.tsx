import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await rpcClient.invite.accept({ token });
        const envs = await rpcClient.environment.list({
          workspaceId: result.workspaceId,
        });
        const environmentId = resolveEnvironmentId(result.workspaceId, envs);
        if (!environmentId) {
          setError("This workspace does not have an environment yet.");
          return;
        }

        navigate({
          to: "/$workspaceId/$environmentId",
          params: {
            workspaceId: result.workspaceId,
            environmentId,
          },
        });
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "Could not accept this invite.",
        );
      }
    })();
  }, [token, navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4 text-sm">
      {error ?? "Accepting invite..."}
    </div>
  );
}
