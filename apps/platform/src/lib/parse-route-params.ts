import { isPublicPath } from "@/lib/session-query";

const NON_ENVIRONMENT_SEGMENTS = new Set(["bookmarks", "connections", "settings"]);

export function parseRouteParamsFromPathname(pathname: string) {
  if (isPublicPath(pathname)) {
    return {
      workspaceId: undefined,
      environmentId: undefined,
      queueName: undefined,
    };
  }

  const parts = pathname.split("/").filter(Boolean);
  const workspaceId = parts[0];
  const second = parts[1];

  let environmentId: string | undefined;
  let queueName: string | undefined;

  if (second && !NON_ENVIRONMENT_SEGMENTS.has(second)) {
    environmentId = second;

    if (parts[2] === "queues" && parts[3]) {
      queueName = decodeURIComponent(parts[3]);
    }
  }

  return { workspaceId, environmentId, queueName };
}
