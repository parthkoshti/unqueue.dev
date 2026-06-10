import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2Icon, ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { rpcClient, setWorkspaceId } from "@/lib/api";
import { resolveEnvironmentId } from "@/lib/resolve-environment";

export function WorkspaceSwitcher({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
  });

  const workspaces = workspacesQuery.data ?? [];
  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);

  if (!activeWorkspace) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={activeWorkspace.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-5 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2Icon className="size-3" />
              </div>
              <span className="truncate font-medium">{activeWorkspace.name}</span>
              <ChevronsUpDownIcon className="ml-auto size-3.5 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className="gap-2 p-2"
                onClick={async () => {
                  if (workspace.id === workspaceId) return;
                  setWorkspaceId(workspace.id);
                  const envs = await rpcClient.environment.list({
                    workspaceId: workspace.id,
                  });
                  const environmentId = resolveEnvironmentId(
                    workspace.id,
                    envs,
                  );
                  if (!environmentId) return;
                  navigate({
                    to: "/$workspaceId/$environmentId",
                    params: {
                      workspaceId: workspace.id,
                      environmentId,
                    },
                  });
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2Icon className="size-3.5 shrink-0" />
                </div>
                {workspace.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
