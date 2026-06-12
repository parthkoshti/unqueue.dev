const appUrl = import.meta.env.VITE_APP_URL ?? "https://app.unqueue.dev";

export const env = {
  appUrl,
  links: {
    login: `${appUrl}/login`,
    signup: `${appUrl}/signup`,
  },
};
