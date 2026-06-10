import { ORPCError } from "@orpc/server";

export function unauthorized(): never {
  throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
}

export function forbidden(): never {
  throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
}

export function notFound(resource = "Resource"): never {
  throw new ORPCError("NOT_FOUND", { message: `${resource} not found` });
}
