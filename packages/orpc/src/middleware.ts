import { os } from "@orpc/server";
import type { Role } from "@unstall/shared";
import { hasMinimumRole } from "@unstall/shared";
import type { ORPCContext } from "./context.js";
import { forbidden, unauthorized } from "./errors.js";

const base = os.$context<ORPCContext>();

export const authed = base.middleware(async ({ context, next }) => {
  if (!context.user) unauthorized();
  return next({ context });
});

export function requireRole(minimum: Role) {
  return base.middleware(async ({ context, next }) => {
    if (!context.user) unauthorized();
    if (!context.membership || !hasMinimumRole(context.membership.role, minimum)) {
      forbidden();
    }
    return next({ context });
  });
}
