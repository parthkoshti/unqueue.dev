import { Link } from "@tanstack/react-router";
import { CommandPalette } from "./command-palette";
import { Separator } from "@unstall/ui/components/separator";

export function AppShell({
  workspaceId,
  environmentId,
  children,
}: {
  workspaceId: string;
  environmentId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-10 items-center gap-3 border-b border-[var(--color-border)] px-3">
        <Link to="/" className="text-sm font-semibold">
          Unstall
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <nav className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <Link
            to="/$workspaceId/$environmentId"
            params={{ workspaceId, environmentId }}
            className="hover:text-[var(--color-foreground)]"
          >
            Queues
          </Link>
          <Link
            to="/$workspaceId/bookmarks"
            params={{ workspaceId }}
            className="hover:text-[var(--color-foreground)]"
          >
            Bookmarks
          </Link>
          <Link
            to="/$workspaceId/settings/members"
            params={{ workspaceId }}
            className="hover:text-[var(--color-foreground)]"
          >
            Settings
          </Link>
        </nav>
        <div className="ml-auto text-xs text-[var(--color-muted-foreground)]">
          Cmd+K
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
      <CommandPalette workspaceId={workspaceId} environmentId={environmentId} />
    </div>
  );
}
