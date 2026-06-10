import { createFileRoute, Outlet } from "@tanstack/react-router";
import { setWorkspaceId } from "@/lib/api";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/$workspaceId/$environmentId")({
  beforeLoad: ({ params }) => {
    setWorkspaceId(params.workspaceId);
  },
  component: () => {
    const { workspaceId, environmentId } = Route.useParams();
    return (
      <AppShell workspaceId={workspaceId} environmentId={environmentId}>
        <Outlet />
      </AppShell>
    );
  },
});
