import { createAuthClient } from "better-auth/react";

const apiUrl = import.meta.env.VITE_API_URL ?? "";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: apiUrl,
});
