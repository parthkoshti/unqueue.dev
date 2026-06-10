import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronsUpDownIcon, ServerIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwitcherSkeleton } from "@/components/app-sidebar-skeleton";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { rpcClient } from "@/lib/api";
import { setPreferredEnvironmentId } from "@/lib/preferences";
import { cn } from "@/lib/utils";

export function EnvironmentSwitcher({
  workspaceId,
  environmentId,
}: {
  workspaceId: string;
  environmentId: string;
}) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const environmentsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const environments = environmentsQuery.data ?? [];
  const activeEnvironment = environments.find((e) => e.id === environmentId);

  if (environmentsQuery.isPending) {
    return <SwitcherSkeleton />;
  }

  if (!activeEnvironment) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={activeEnvironment.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <ServerIcon className="size-4 text-muted-foreground" />
              <span className="truncate">{activeEnvironment.name}</span>
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
              Environments
            </DropdownMenuLabel>
            {environments.map((environment) => {
              const isActive = environment.id === environmentId;

              return (
                <DropdownMenuItem
                  key={environment.id}
                  className="gap-2 p-2"
                  onClick={() => {
                    if (isActive) return;
                    setPreferredEnvironmentId(workspaceId, environment.id);
                    navigate({
                      to: "/$workspaceId/$environmentId",
                      params: {
                        workspaceId,
                        environmentId: environment.id,
                      },
                    });
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <ServerIcon className="size-3.5 shrink-0" />
                  </div>
                  <span className="flex-1 truncate">{environment.name}</span>
                  <CheckIcon
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
