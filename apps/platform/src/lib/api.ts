import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@unstall/server/router";

const apiUrl = import.meta.env.VITE_API_URL ?? "";

let workspaceId: string | undefined;

export function setWorkspaceId(id: string | undefined) {
  workspaceId = id;
}

export const rpcClient: RouterClient<AppRouter> = createORPCClient(
  new RPCLink({
    url: `${apiUrl}/rpc`,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        credentials: "include",
        headers: {
          ...init?.headers,
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
      }),
  }),
);
