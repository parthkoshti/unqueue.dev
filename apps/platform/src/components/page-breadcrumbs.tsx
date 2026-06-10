import { Link, useRouterState } from "@tanstack/react-router";
import { parseRouteParamsFromPathname } from "@/lib/parse-route-params";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { workspaceId, environmentId, queueName } =
    parseRouteParamsFromPathname(pathname);

  const segments: { label: string; to?: string; params?: Record<string, string> }[] =
    [];

  if (pathname === "/login") {
    segments.push({ label: "Sign in" });
  } else if (pathname === "/signup") {
    segments.push({ label: "Sign up" });
  } else if (pathname.startsWith("/invite/")) {
    segments.push({ label: "Invite" });
  } else if (!workspaceId) {
    return null;
  } else if (pathname.endsWith("/settings/environments")) {
    segments.push({ label: "Environments" });
  } else if (pathname.endsWith("/settings/members")) {
    segments.push({ label: "Members" });
  } else if (pathname.endsWith("/connections")) {
    segments.push({ label: "Connections" });
  } else if (pathname.endsWith("/settings/alerts")) {
    segments.push({ label: "Alerts" });
  } else if (pathname.includes("/bookmarks")) {
    segments.push({ label: "Bookmarks" });
  } else if (environmentId) {
    segments.push({
      label: "Queues",
      to: "/$workspaceId/$environmentId",
      params: { workspaceId, environmentId },
    });
    if (queueName) {
      segments.push({ label: decodeURIComponent(queueName) });
    } else {
      segments.push({ label: "Overview" });
    }
  }

  if (segments.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <span key={`${segment.label}-${index}`} className="contents">
              {index > 0 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : undefined}>
                {isLast || !segment.to ? (
                  <BreadcrumbPage className="truncate">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={segment.to}
                      params={segment.params}
                      className="truncate"
                    >
                      {segment.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
