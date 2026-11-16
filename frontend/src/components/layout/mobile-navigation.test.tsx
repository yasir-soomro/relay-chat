import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

let originalInnerWidth: number | null = null;

afterEach(() => {
  if (originalInnerWidth !== null) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
    originalInnerWidth = null;
  }
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  vi.useRealTimers();
});

function openNavigation() {
  const menuButton = screen.getByRole("button", {
    name: "Open navigation menu",
  });
  fireEvent.click(menuButton);
  return menuButton;
}

describe("MobileNavigation", () => {
  it("shows links, locks background scrolling, and closes after navigation", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const menuButton = openNavigation();

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href"))
      .toBe("/login");

    fireEvent.click(screen.getByRole("link", { name: "Sign in" }));

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(menuButton);
  });

  it("closes when the backdrop is clicked", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const menuButton = openNavigation();
    const dialog = screen.getByRole("dialog", { name: "Main navigation" });
    const backdrop = dialog.parentElement as HTMLElement;

    fireEvent.click(backdrop);

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("traps keyboard focus and closes on Escape", () => {
    render(<MobileNavigation ariaLabel="Main navigation" items={items} />);

    const menuButton = openNavigation();
    const closeButton = screen.getByRole("button", {
      name: "Close menu",
    });
    const lastLink = screen.getByRole("link", { name: "Sign in" });

    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(lastLink, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastLink);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton);
  });

  it("closes when resized past the mobile navigation breakpoint", () => {
    originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
    });
    render(
      <MobileNavigation
        ariaLabel="Main navigation"
        desktopMinWidth={800}
        items={items}
      />,
    );

    const menuButton = openNavigation();
    fireEvent(window, new Event("resize"));

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });
});
