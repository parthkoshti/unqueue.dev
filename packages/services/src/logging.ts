import type { Logger } from "@unqueue/logger";

export function createServiceLogger(
  logger: Logger,
  service: string,
): Logger {
  return logger.child({ service });
}
