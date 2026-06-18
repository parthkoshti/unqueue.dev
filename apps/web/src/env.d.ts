/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@astrojs/starlight/virtual" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  rybbit?: {
    pageview: () => void;
    event: (name: string, data?: Record<string, unknown>) => void;
  };
}
