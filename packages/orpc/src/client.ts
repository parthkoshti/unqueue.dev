import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./router.js";

export function createAppClient(baseUrl: string): RouterClient<AppRouter> {
  const link = new RPCLink({
    url: `${baseUrl}/rpc`,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        credentials: "include",
      }),
  });

  return createORPCClient(link);
}
