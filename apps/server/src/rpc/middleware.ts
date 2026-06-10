import { os } from "@orpc/server";
import type { Role } from "@unstall/shared";
import { hasMinimumRole } from "@unstall/shared";
import { ORPCError } from "@orpc/server";
import type { ServerContext } from "./context.js";

const base = os.$context<ServerContext>();

export const authed = base.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }
  return next({ context });
});

export function requireRole(minimum: Role) {
  return base.middleware(async ({ context, next }) => {
    if (!context.user) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }
    if (!context.membership || !hasMinimumRole(context.membership.role, minimum)) {
      throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
    }
    return next({ context });
  });
}
