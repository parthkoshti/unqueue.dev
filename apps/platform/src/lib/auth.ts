import { createAuthClient } from "better-auth/react";
import { apiUrl } from "./api-url";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: apiUrl,
});
