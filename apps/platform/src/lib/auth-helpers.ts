import type { QueryClient } from "@tanstack/react-query";
import { sessionQueryOptions } from "@/lib/session-query";

export function getPlatformUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function authCallbackUrl(path = "/verify-email") {
  return `${getPlatformUrl()}${path}`;
}

export function safeRedirectPath(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function refreshSession(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["session"] });
  return queryClient.fetchQuery(sessionQueryOptions());
}
