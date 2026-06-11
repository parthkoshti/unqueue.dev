const DEFAULT_API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL must be set in production builds");
}

export const apiUrl = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
