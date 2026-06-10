import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth";
import { rpcClient } from "@/lib/api";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const session = await authClient.getSession();
      if (!session.data?.user) {
        throw redirect({ to: "/login" });
      }

      const result = await rpcClient.invite.accept({ token });
      const envs = await rpcClient.environment.list({
        workspaceId: result.workspaceId,
      });
      const environmentId = envs[0]?.id;
      if (!environmentId) return;

      navigate({
        to: "/$workspaceId/$environmentId",
        params: {
          workspaceId: result.workspaceId,
          environmentId,
        },
      });
    })();
  }, [token, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center text-sm">
      Accepting invite...
    </div>
  );
}
