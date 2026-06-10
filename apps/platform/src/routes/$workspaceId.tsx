import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { setWorkspaceId } from "@/lib/api";

export const Route = createFileRoute("/$workspaceId")({
  beforeLoad: ({ params }) => {
    setWorkspaceId(params.workspaceId);
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
