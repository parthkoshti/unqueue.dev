import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

const PLATFORM_NAV_ITEMS = 4;
const QUEUE_NAV_ITEMS = 5;
const WORKSPACE_NAV_ITEMS = 2;

export function SwitcherSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuSkeleton showIcon />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavGroupSkeleton({
  label,
  itemCount,
  hideWhenCollapsed = false,
  headerExtra,
}: {
  label: string;
  itemCount: number;
  hideWhenCollapsed?: boolean;
  headerExtra?: ReactNode;
}) {
  return (
    <SidebarGroup
      className={hideWhenCollapsed ? "group-data-[collapsible=icon]:hidden" : undefined}
    >
      <SidebarGroupLabel className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {headerExtra}
      </SidebarGroupLabel>
      <SidebarMenu>
        {Array.from({ length: itemCount }, (_, i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function NavQueuesSkeleton({ itemCount = QUEUE_NAV_ITEMS }: { itemCount?: number }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between gap-2">
        <span>Queues</span>
        <Skeleton className="h-3 w-24 shrink-0" />
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="relative mb-1 px-2">
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
        <SidebarMenu>
          {Array.from({ length: itemCount }, (_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function FooterUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 rounded-md px-2">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="size-4 shrink-0 rounded-sm" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function FooterThemeToggleSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-8 items-center gap-2 rounded-md px-2">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-3.5 w-20 flex-1" />
          <Skeleton className="size-2 shrink-0 rounded-full group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebarSkeleton() {
  return (
    <>
      <SidebarHeader className="gap-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-16 group-data-[collapsible=icon]:hidden" />
        </div>
        <SwitcherSkeleton />
        <SwitcherSkeleton />
      </SidebarHeader>
      <SidebarContent>
        <NavGroupSkeleton label="Platform" itemCount={PLATFORM_NAV_ITEMS} />
        <NavQueuesSkeleton />
        <NavGroupSkeleton
          label="Workspace"
          itemCount={WORKSPACE_NAV_ITEMS}
          hideWhenCollapsed
        />
      </SidebarContent>
      <SidebarFooter>
        <FooterThemeToggleSkeleton />
        <FooterUserSkeleton />
      </SidebarFooter>
    </>
  );
}
