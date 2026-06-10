export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "CONFLICT";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export function notFound(resource = "Resource"): never {
  throw new ServiceError("NOT_FOUND", `${resource} not found`);
}

export function forbidden(message = "Forbidden"): never {
  throw new ServiceError("FORBIDDEN", message);
}

export function unauthorized(message = "Unauthorized"): never {
  throw new ServiceError("UNAUTHORIZED", message);
}
