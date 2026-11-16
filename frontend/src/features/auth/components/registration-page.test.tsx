import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/register",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ status: "anonymous" }),
}));

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { RegistrationPage } from "@/features/auth/components/registration-page";

describe("registration page", () => {
  it("shows Relay branding, registration fields, and the supplied conversation portrait", () => {
    render(<RegistrationPage />);

    expect(
      screen.getByRole("heading", { name: "Less noise. More connection." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Your next hello starts here." }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Full name").getAttribute("name")).toBe(
      "display_name",
    );
    expect(screen.getByLabelText("Username").getAttribute("name")).toBe(
      "username",
    );
    expect(screen.getByLabelText("Email").getAttribute("name")).toBe("email");
    expect(screen.getByLabelText("Password").getAttribute("name")).toBe(
      "password",
    );
    expect(screen.getByText("Discover")).toBeTruthy();
    expect(screen.getByText("Connect")).toBeTruthy();
    expect(screen.getByText("Say hello")).toBeTruthy();
  });

  it("keeps the password toggle accessible and shows client-side validation", () => {
    render(<RegistrationPage />);

    const password = screen.getByLabelText("Password");
    expect(password.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.getAttribute("type")).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      screen.getByText("Display name must be between 1 and 50 characters."),
    ).toBeTruthy();
    expect(
      screen.getByText("Use 3–30 lowercase letters, numbers, or underscores."),
    ).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Password must be between 12 and 128 characters."),
    ).toBeTruthy();
  });

  it("uses the supplied logo and sign-in link without the standard public footer", () => {
    render(
      <>
        <Navbar />
        <Footer />
      </>,
    );

    expect(screen.getByRole("link", { name: "Relay home" })).toBeTruthy();
    expect(
      document.querySelector(".site-brand-image")?.getAttribute("src"),
    ).toContain("Relay");
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/login");
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });
});
