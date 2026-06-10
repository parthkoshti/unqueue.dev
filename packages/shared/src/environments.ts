export const DEFAULT_ENVIRONMENT_NAMES = [
  "production",
  "staging",
  "development",
] as const;

export const DEFAULT_ENVIRONMENT_NAME = "development";

export type DefaultEnvironmentName = (typeof DEFAULT_ENVIRONMENT_NAMES)[number];
