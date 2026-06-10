import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { NavSearch } from "@/components/nav-search";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { ShellLayoutProvider, ShellProvider } from "@/components/shell-context";
import { useShellContext } from "@/hooks/use-shell-context";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { workspaceId, environmentId, hasNavigationContext } = useShellContext();

  return (
    <ShellLayoutProvider>
      <ShellProvider
        value={{
          openCommandPalette: () => {
            if (hasNavigationContext) setCommandOpen(true);
          },
        }}
      >
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar workspaceId={workspaceId} environmentId={environmentId} />
            <SidebarInset className="flex h-svh flex-col">
              <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger className="-ml-1" />
                <PageBreadcrumbs />
                {hasNavigationContext && (
                  <div className="ml-auto shrink-0">
                    <NavSearch />
                  </div>
                )}
              </header>
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </main>
            </SidebarInset>
            {hasNavigationContext && workspaceId && environmentId && (
              <CommandPalette
                workspaceId={workspaceId}
                environmentId={environmentId}
                open={commandOpen}
                onOpenChange={setCommandOpen}
              />
            )}
          </SidebarProvider>
        </TooltipProvider>
      </ShellProvider>
    </ShellLayoutProvider>
  );
}
