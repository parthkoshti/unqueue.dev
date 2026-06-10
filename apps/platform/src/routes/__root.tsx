import { createRootRouteWithContext, Outlet, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { isPublicPath, sessionQueryOptions } from "@/lib/session-query";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context, location }) => {
    if (isPublicPath(location.pathname)) return;

    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (!session?.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
