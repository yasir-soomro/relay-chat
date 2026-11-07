import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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

const items = [
  { href: "/#principles", label: "Our approach" },
  { href: "/login", label: "Sign in" },
] as const;

describe("MobileNavigation", () => {
  it("closes after selecting a navigation link", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const summary = screen.getByText("Menu");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);

    fireEvent.click(summary);
    expect(details?.open).toBe(true);

    fireEvent.click(screen.getByRole("link", { name: "Sign in" }));
    expect(details?.open).toBe(false);
  });

  it("closes on an outside click", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const details = screen.getByText("Menu").closest("details");
    fireEvent.click(screen.getByText("Menu"));
    fireEvent.click(document.body);

    expect(details?.open).toBe(false);
  });

  it("closes on Escape and returns focus to the menu control", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const summary = screen.getByText("Menu");
    const details = summary.closest("details");
    fireEvent.click(summary);
    fireEvent.keyDown(details as HTMLDetailsElement, { key: "Escape" });

    expect(details?.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
});
