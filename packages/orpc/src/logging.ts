const isDev = process.env.NODE_ENV !== "production";

export const isRpcVerboseLoggingEnabled = !isDev;
