import { createFileRoute, Outlet } from "@tanstack/react-router";
import { setWorkspaceId } from "@/lib/api";

export const Route = createFileRoute("/$workspaceId")({
  beforeLoad: ({ params }) => {
    setWorkspaceId(params.workspaceId);
  },
  component: () => <Outlet />,
});
