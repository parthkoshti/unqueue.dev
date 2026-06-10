import { os } from "@orpc/server";
import { getLogger } from "@orpc/experimental-pino";
import type { Role } from "@unstall/shared";
import { hasMinimumRole } from "@unstall/shared";
import { ORPCError } from "@orpc/server";
import { ServiceError } from "@unstall/services";
import type { ServerContext } from "./context.js";
import { isRpcVerboseLoggingEnabled } from "./logging.js";

const base = os.$context<ServerContext>();

export const rpcLogging = base.middleware(async ({ context, next, path }) => {
  const procedure = path.join(".");
  const requestLogger =
    getLogger(context) ?? context.logger.child({ rpc: { procedure } });

  const start = performance.now();
  const fields = {
    procedure,
    userId: context.user?.id,
    workspaceId: context.membership?.workspaceId,
  };

  if (isRpcVerboseLoggingEnabled) {
    requestLogger.debug(fields, "rpc procedure started");
  }

  try {
    const result = await next();
    if (isRpcVerboseLoggingEnabled) {
      requestLogger.info(
        { ...fields, durationMs: Math.round(performance.now() - start) },
        "rpc procedure completed",
      );
    }
    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);

    if (error instanceof ORPCError || error instanceof ServiceError) {
      requestLogger.warn(
        {
          ...fields,
          durationMs,
          code: error.code,
        },
        "rpc procedure rejected",
      );
    } else {
      requestLogger.error({ ...fields, durationMs, err: error }, "rpc procedure failed");
    }

    throw error;
  }
});

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

export const serviceErrors = base.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new ORPCError(error.code, { message: error.message });
    }
    throw error;
  }
});
