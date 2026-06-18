const configuredApiUrl = import.meta.env.PUBLIC_API_URL?.trim();
const apiUrl = (
  configuredApiUrl ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://api.unqueue.dev")
).replace(/\/$/, "");

export const env = {
  apiUrl,
};
