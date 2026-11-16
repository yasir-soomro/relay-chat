import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNavbar } from "@/components/layout/app-navbar";

const { replace, signOut } = vi.hoisted(() => ({
  replace: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useRouter: () => ({ replace }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/layout/site-brand", () => ({
  SiteBrand: () => <span>Relay</span>,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => (
    <button aria-label="Theme preference" type="button">
      Theme
    </button>
  ),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ signOut }),
}));

vi.mock("@/features/notifications/providers/notifications-provider", () => ({
  useOptionalNotifications: () => ({ unreadCount: 0 }),
}));

describe("AppNavbar", () => {
  beforeEach(() => {
    replace.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
  });

  it("shows app routes once with icons and preserves sign-out behavior", async () => {
    render(<AppNavbar />);

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    fireEvent.click(menuButton);

    const navigation = screen.getByRole("navigation", {
      name: "Application navigation",
    });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual([
      "Overview",
      "Conversations",
      "Notifications",
      "Discover",
      "Connections",
      "Profile",
    ]);
    expect(within(navigation).getByRole("link", { name: "Discover" })
      .getAttribute("aria-current")).toBe("page");
    expect(navigation.querySelectorAll("svg")).toHaveLength(6);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(signOutButton);
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledOnce();
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });
});
