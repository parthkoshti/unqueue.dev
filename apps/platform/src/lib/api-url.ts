const DEFAULT_DEV_API_URL = "http://localhost:3001";

export const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_DEV_API_URL;
