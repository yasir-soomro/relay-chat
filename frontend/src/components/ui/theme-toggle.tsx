"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const nextPreference =
    preference === "system" ? "light" : preference === "light" ? "dark" : "system";

  return (
    <Button
      aria-label={`Theme preference: ${preference}. Activate to switch to ${nextPreference}.`}
      className={
        compact
          ? "size-10 min-h-10 shrink-0 px-0"
          : "shrink-0 px-3"
      }
      onClick={() => setPreference(nextPreference)}
      title={`Theme: ${preference} · switch to ${nextPreference}`}
      type="button"
      variant="secondary"
    >
      {preference === "system" ? (
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <rect
            height="13"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.8"
            width="18"
            x="3"
            y="3"
          />
          <path
            d="M8 21h8m-4-5v5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : preference === "dark" ? (
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
          {preference}
        </span>
      )}
    </Button>
  );
}
