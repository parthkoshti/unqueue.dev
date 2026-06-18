const apiUrl = import.meta.env.PUBLIC_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export const env = {
  apiUrl,
};
