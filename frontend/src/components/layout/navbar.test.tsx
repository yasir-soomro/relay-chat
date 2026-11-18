import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthNavbar } from "@/components/layout/auth-navbar";
import { Navbar } from "@/components/layout/navbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/why-relay",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
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

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/features/auth/providers/auth-provider", () => ({ useAuth }));

describe("Navbar", () => {
  beforeEach(() => useAuth.mockReturnValue({ status: "unauthenticated", account: null }));
  it("keeps public navigation ordered and links to the existing account routes", () => {
    render(<Navbar />);

    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["How it works", "Why Relay", "FAQs"]);
    expect(
      within(navigation)
        .getByRole("link", { name: "Why Relay" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href"))
      .toBe("/login");
    expect(
      screen.getByRole("link", { name: "Create account" }).getAttribute("href"),
    ).toBe("/register");
  });

  it("keeps the private SpaceHub out of logged-out mobile navigation", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const menu = within(screen.getByRole("dialog", { name: "Main navigation" }));
    expect(menu.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(menu.getByRole("link", { name: "Create account" }).getAttribute("href")).toBe("/register");
    expect(menu.queryByRole("link", { name: "SpaceHub" })).toBeNull();
  });

  it("shows ordered, active public links and the theme control in the mobile menu", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = within(screen.getByRole("dialog", { name: "Main navigation" }));
    const navigation = dialog.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent?.trim()))
      .toEqual(["How it works", "Why Relay", "FAQs"]);
    expect(within(navigation).getByRole("link", { name: "Why Relay" }).getAttribute("aria-current"))
      .toBe("page");
    expect(dialog.getByText("Appearance")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Theme preference" })).toBeTruthy();
    expect(navigation.querySelectorAll("svg")).toHaveLength(3);
    expect(dialog.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(dialog.getByRole("link", { name: "Create account" }).getAttribute("href")).toBe("/register");
  });

  it("keeps sign-in and registration navigation on their existing routes", () => {
    const { rerender } = render(<AuthNavbar mode="login" />);

    expect(screen.getByRole("link", { name: "Create account" }).getAttribute("href"))
      .toBe("/register");

    rerender(<AuthNavbar mode="register" />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href"))
      .toBe("/login");
  });

  it("shows authenticated navigation and profile controls", () => {
    useAuth.mockReturnValue({ status: "authenticated", account: { display_name: "Relay User" } });
    render(<Navbar />);
    expect(screen.getByText("Relay User")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My Profile" }).getAttribute("href")).toBe("/app/profile");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { name: "Why Relay" })).toBeTruthy();
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent?.trim()))
      .toEqual(["How it works", "Why Relay", "FAQs"]);
    expect(navigation.querySelectorAll("svg")).toHaveLength(3);
    expect(navigation.className).toContain("xl:justify-self-center");
    expect(navigation.closest("header")?.firstElementChild?.className)
      .toContain("xl:grid-cols-");
    expect(screen.getByRole("link", { name: "SpaceHub" }).getAttribute("href")).toBe("/app");
    expect(screen.queryByRole("link", { name: "Conversations" })).toBeNull();
  });

  it("puts authenticated profile, appearance, and logout actions in the mobile drawer", () => {
    useAuth.mockReturnValue({ status: "authenticated", account: { display_name: "Relay User" } });
    render(<Navbar />);
    expect(screen.getByRole("img", { name: "Relay User avatar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open navigation menu" })
      .closest('[class~="xl:hidden"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = within(screen.getByRole("dialog", { name: "Main navigation" }));
    expect(dialog.getByRole("link", { name: "My Profile" }).getAttribute("href")).toBe("/app/profile");
    expect(dialog.getByRole("button", { name: "Theme preference" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("keeps auth controls hidden while session hydration is pending", () => {
    useAuth.mockReturnValue({ status: "loading", account: null });
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My Profile" })).toBeNull();
  });
});
