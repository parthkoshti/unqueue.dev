import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_TOGGLE_KEY = "theme-toggle";
const STARLIGHT_THEME_KEY = "starlight-theme";
const LEGACY_THEME_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const novaTheme = localStorage.getItem(THEME_TOGGLE_KEY);
  if (isTheme(novaTheme)) {
    return novaTheme;
  }

  const starlightTheme = localStorage.getItem(STARLIGHT_THEME_KEY);
  if (isTheme(starlightTheme)) {
    return starlightTheme;
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  return isTheme(legacyTheme) ? legacyTheme : "dark";
}

function storeTheme(theme: Theme) {
  localStorage.setItem(THEME_TOGGLE_KEY, theme);
  localStorage.removeItem(STARLIGHT_THEME_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    storeTheme(nextTheme);
    applyTheme(nextTheme);
  }

  useEffect(() => {
    storeTheme(theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
