import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({
    error: null,
    signIn: vi.fn(),
    status: "anonymous",
  }),
}));

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { LoginPage } from "@/features/auth/components/login-page";

describe("sign-in page", () => {
  it("matches the concise sign-in layout and keeps account creation linked", () => {
    render(
      <>
        <Navbar />
        <LoginPage />
        <Footer />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "Welcome back." }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Create account" }).getAttribute("href"),
    ).toBe("/register");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
    expect(document.querySelector(".landing-public-footer")).toBeNull();
  });

  it("keeps the password visibility control available", () => {
    render(<LoginPage />);

    const password = screen.getByLabelText("Password");
    expect(password.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.getAttribute("type")).toBe("text");
  });
});
