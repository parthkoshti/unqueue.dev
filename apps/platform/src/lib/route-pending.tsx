import { AppShell } from "@/components/app-shell";
import {
  EnvironmentOverviewContentSkeleton,
  EnvironmentOverviewHeaderSkeleton,
} from "@/components/environment-overview-skeleton";
import { QueuePageSkeleton } from "@/components/queue-page-skeleton";
import { useIsInShellLayout } from "@/components/shell-context";
import { Skeleton } from "@/components/ui/skeleton";
import { isPublicPath } from "@/lib/session-query";
import { useRouterState } from "@tanstack/react-router";

function DefaultPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function RoutePendingContent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.includes("/queues/")) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <QueuePageSkeleton />
        </div>
      </div>
    );
  }

  if (pathname.match(/\/[^/]+\/[^/]+\/?$/)) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
          <EnvironmentOverviewHeaderSkeleton />
        </div>
        <div className="space-y-4 p-4">
          <EnvironmentOverviewContentSkeleton />
        </div>
      </div>
    );
  }

  return <DefaultPageSkeleton />;
}

export function RoutePending() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const inShellLayout = useIsInShellLayout();

  if (isPublicPath(pathname)) {
    return null;
  }

  const content = <RoutePendingContent />;

  if (inShellLayout) {
    return content;
  }

  return <AppShell>{content}</AppShell>;
}
