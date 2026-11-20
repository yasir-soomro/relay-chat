import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/components/ui/theme-provider";

describe("theme preference", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
    vi.stubGlobal(
      "matchMedia",
      () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.dataset.theme = "light";
  });

  it("toggles between Light and Dark while persisting through the provider", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggles = await screen.findAllByRole("button", {
      name: "Switch to dark theme",
    });
    const firstToggle = toggles[0];
    if (!firstToggle) {
      throw new Error("Expected theme switchers to render");
    }
    fireEvent.click(firstToggle);

    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("relay-theme")).toBe("dark");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Switch to light theme" })[0]!,
    );

    expect(document.documentElement.dataset.themePreference).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getAllByRole("button", { name: "Switch to dark theme" })).toHaveLength(2);
  });

  it("follows operating system changes while the preference is System", () => {
    let isDark = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal("matchMedia", () => ({
      matches: isDark,
      addEventListener: (
        _event: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.add(listener),
      removeEventListener: (
        _event: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.delete(listener),
    }));

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("light");

    isDark = true;
    listeners.forEach((listener) => {
      listener(new Event("change") as MediaQueryListEvent);
    });

    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
