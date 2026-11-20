"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const isDark =
    preference === "dark" ||
    (preference === "system" &&
      (typeof document === "undefined" ||
        document.documentElement.dataset.theme === "dark"));
  const nextPreference = isDark ? "light" : "dark";

  return (
    <Button
      aria-label={`Switch to ${nextPreference} theme`}
      className={
        compact
          ? "size-10 min-h-10 shrink-0 px-0"
          : "shrink-0 px-3"
      }
      onClick={() => setPreference(nextPreference)}
      title={`Switch to ${nextPreference} theme`}
      type="button"
      variant="secondary"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.6 8.6 0 1 0 20.2 15.1Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
      {compact ? null : (
        <span className="hidden text-xs font-medium capitalize sm:inline">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </Button>
  );
}
