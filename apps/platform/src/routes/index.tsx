import { createFileRoute, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { AppShellSkeleton } from "@/components/app-sidebar-skeleton";
import { resolveAuthenticatedLanding } from "@/lib/auth-helpers";

export const Route = createFileRoute("/")({
  pendingComponent: AppShellSkeleton,
  loader: async ({ context }: { context: { queryClient: QueryClient } }) => {
    const landing = await resolveAuthenticatedLanding(context.queryClient);
    if (!landing) throw redirect({ to: "/login" });

    throw redirect({
      to: landing.to,
      params: landing.params,
    });
  },
});
