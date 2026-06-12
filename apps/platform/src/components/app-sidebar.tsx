import type * as React from "react";
import { Link } from "@tanstack/react-router";
import { BrandmarkIcon } from "@/components/logo";
import { NavMain } from "@/components/nav-main";
import { NavQueues } from "@/components/nav-queues";
import { NavSettings } from "@/components/nav-settings";
import { NavUser } from "@/components/nav-user";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
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
            <BrandmarkIcon size={32} />
            <span className="truncate font-mono text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Unqueue
            </span>
          </Link>
        ) : (
          <Link
            to="/"
            className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <BrandmarkIcon size={32} />
            <span className="truncate font-mono text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Unqueue
            </span>
          </Link>
        )}
        {workspaceId && <WorkspaceSwitcher workspaceId={workspaceId} />}
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
      <SidebarFooter className="gap-0 p-0">
        <SidebarSeparator className="mx-0" />
        <div className="p-2">
          <NavUser />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
