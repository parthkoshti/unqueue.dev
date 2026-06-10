import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@unstall/server/router";

const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

let workspaceId: string | undefined;

export function setWorkspaceId(id: string | undefined) {
  workspaceId = id;
}

export const rpcClient: RouterClient<AppRouter> = createORPCClient(
  new RPCLink({
    url: `${apiUrl}/rpc`,
    fetch: (request, init) => {
      const headers = new Headers(request.headers);
      if (workspaceId) {
        headers.set("x-workspace-id", workspaceId);
      }

      return fetch(request, {
        ...init,
        credentials: "include",
        headers,
      });
    },
  }),
);
