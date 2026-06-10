import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { useQuery as useEnvQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/$workspaceId/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const { workspaceId } = Route.useParams();

  const envsQuery = useEnvQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const environmentId = envsQuery.data?.[0]?.id ?? "";

  const bookmarksQuery = useQuery({
    queryKey: ["bookmarks", workspaceId],
    queryFn: () => rpcClient.bookmark.list({ workspaceId }),
  });

  const foldersQuery = useQuery({
    queryKey: ["bookmark-folders", workspaceId],
    queryFn: () => rpcClient.bookmark.listFolders({ workspaceId }),
  });

  if (!environmentId) return null;

  return (
    <AppShell workspaceId={workspaceId} environmentId={environmentId}>
      <div className="p-4">
        <h1 className="mb-4 text-sm font-medium">Bookmarks</h1>
        <div className="grid grid-cols-2 gap-4">
          <section>
            <h2 className="mb-2 text-xs text-[var(--color-muted-foreground)]">Folders</h2>
            <ul className="space-y-1 text-xs">
              {(foldersQuery.data ?? []).map((folder) => (
                <li key={folder.id}>{folder.name}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-xs text-[var(--color-muted-foreground)]">Bookmarks</h2>
            <ul className="space-y-1 text-xs">
              {(bookmarksQuery.data ?? []).map((bookmark) => (
                <li key={bookmark.id}>
                  {bookmark.targetType} - {JSON.stringify(bookmark.targetRef)}
                  {bookmark.isShared && " (shared)"}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
