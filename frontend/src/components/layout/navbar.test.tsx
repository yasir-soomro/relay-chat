import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthNavbar } from "@/components/layout/auth-navbar";
import { Navbar } from "@/components/layout/navbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/why-relay",
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

describe("Navbar", () => {
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

  it("keeps sign-in and registration navigation on their existing routes", () => {
    const { rerender } = render(<AuthNavbar mode="login" />);

    expect(screen.getByRole("link", { name: "Create account" }).getAttribute("href"))
      .toBe("/register");

    rerender(<AuthNavbar mode="register" />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href"))
      .toBe("/login");
  });
});
