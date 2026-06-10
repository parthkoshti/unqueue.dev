import type * as React from "react";
import { Link } from "@tanstack/react-router";
import { EnvironmentSwitcher } from "@/components/environment-switcher";
import { NavMain } from "@/components/nav-main";
import { NavQueues } from "@/components/nav-queues";
import { NavSettings } from "@/components/nav-settings";
import { NavThemeToggle } from "@/components/nav-theme-toggle";
import { NavUser } from "@/components/nav-user";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  workspaceId,
  environmentId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspaceId?: string;
  environmentId?: string;
}) {
  const hasNavigationContext = !!workspaceId && !!environmentId;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-2">
        {hasNavigationContext ? (
          <Link
            to="/$workspaceId/$environmentId"
            params={{ workspaceId, environmentId }}
            className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              U
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Unstall
            </span>
          </Link>
        ) : (
          <Link
            to="/"
            className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              U
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Unstall
            </span>
          </Link>
        )}
        {workspaceId && <WorkspaceSwitcher workspaceId={workspaceId} />}
        {hasNavigationContext && (
          <EnvironmentSwitcher
            workspaceId={workspaceId}
            environmentId={environmentId}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        {hasNavigationContext ? (
          <>
            <NavMain workspaceId={workspaceId} environmentId={environmentId} />
            <NavQueues workspaceId={workspaceId} environmentId={environmentId} />
            <NavSettings workspaceId={workspaceId} />
          </>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavThemeToggle />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
