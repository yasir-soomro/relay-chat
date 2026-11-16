import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HowItWorksPage from "@/app/(public)/how-it-works/page";
import FrequentlyAskedQuestionsPage from "@/app/(public)/faqs/page";
import WhyRelayPage from "@/app/(public)/why-relay/page";

describe("public information pages", () => {
  it("explains discovery, mutual connection, and messaging", () => {
    render(<HowItWorksPage />);

    expect(
      screen.getByRole("heading", { name: "A good conversation starts simply." }),
    ).toBeTruthy();
    expect(screen.getByText("Discover")).toBeTruthy();
    expect(screen.getByText("Connect")).toBeTruthy();
    expect(screen.getByText("Say hello")).toBeTruthy();
    expect(screen.getByRole("link", { name: /create an account/i })).toBeTruthy();
  });

  it("describes mutual messaging and personal boundaries", () => {
    render(<WhyRelayPage />);

    expect(screen.getByText("Connection is mutual")).toBeTruthy();
    expect(screen.getByText("Conversations stay one-to-one")).toBeTruthy();
    expect(screen.getByText("Your boundaries stay yours")).toBeTruthy();
  });

  it("provides working expandable answers using the confirmed product rules", () => {
    render(<FrequentlyAskedQuestionsPage />);

    const question = screen.getByText(
      "Can I message someone before they accept my request?",
    );
    const details = question.closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(question);

    expect(details?.open).toBe(true);
    expect(
      screen.getByText(
        "No. New messages are available only after a connection request is accepted and the connection is not blocked or removed.",
      ),
    ).toBeTruthy();
  });
});
