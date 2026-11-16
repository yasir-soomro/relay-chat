"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
type ThemePreference = "system" | Theme;

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const THEME_STORAGE_KEY = "relay-theme";
const THEME_CHANGE_EVENT = "relay-theme-change";
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? "dark" : "light";
}

function getCurrentPreference(): ThemePreference {
  const preference = document.documentElement.dataset.themePreference;
  return isThemePreference(preference) ? preference : "system";
}

function applyPreference(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme =
    preference === "system" ? getSystemTheme() : preference;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribeToPreference(onChange: () => void) {
  function syncFromStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) {
      return;
    }

    const preference = isThemePreference(event.newValue)
      ? event.newValue
      : "system";
    applyPreference(preference);
  }

  function syncSystemTheme() {
    if (getCurrentPreference() === "system") {
      document.documentElement.dataset.theme = getSystemTheme();
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    }
  }

  const mediaQuery = window.matchMedia(DARK_SCHEME_QUERY);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", syncFromStorage);
  mediaQuery.addEventListener("change", syncSystemTheme);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", syncFromStorage);
    mediaQuery.removeEventListener("change", syncSystemTheme);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeToPreference,
    getCurrentPreference,
    (): ThemePreference => "system",
  );

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    applyPreference(nextPreference);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
