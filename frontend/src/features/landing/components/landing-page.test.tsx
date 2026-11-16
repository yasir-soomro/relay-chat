import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "@/features/landing/components/landing-page";

describe("LandingPage", () => {
  it("explains the connection flow and links account actions to existing routes", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: "A good conversation starts simply." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "A conversation takes two yeses." }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Create an account" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Sign in" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Create an account" }).every(
      (link) => link.getAttribute("href") === "/register",
    )).toBe(true);
    expect(screen.getAllByRole("link", { name: "Sign in" }).every(
      (link) => link.getAttribute("href") === "/login",
    )).toBe(true);
  });

  it("answers questions using Relay's actual messaging and profile boundaries", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(/New messages are available only after a connection request is accepted/),
    ).toBeTruthy();
    expect(
      screen.getByText(/username, display name, and bio/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Conversation history remains available to its participants/),
    ).toBeTruthy();
    expect(
      screen.getByText(/indicate the status Relay has confirmed/),
    ).toBeTruthy();
  });
});
