import type { Logger } from "@unstall/logger";

export function createServiceLogger(
  logger: Logger,
  service: string,
): Logger {
  return logger.child({ service });
}
