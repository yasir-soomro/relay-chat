import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicProfilePage } from "@/features/users/components/public-profile-page";

const { mockUseAuth, mockAuthenticatedFetch } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockAuthenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: mockUseAuth,
}));

const publicProfile = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  username: "relay_user",
  display_name: "Relay User",
  bio: null,
};

describe("PublicProfilePage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      authenticatedFetch: mockAuthenticatedFetch,
    });
    mockAuthenticatedFetch.mockReset();
  });

  it("loads the public profile and never renders its private email", async () => {
    mockAuthenticatedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ ...publicProfile, email: "private@example.com" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<PublicProfilePage userId={publicProfile.id} />);

    expect(screen.getByRole("status").textContent).toContain("Loading profile");
    expect(await screen.findByText("Relay User")).toBeTruthy();
    expect(screen.getByText("@relay_user")).toBeTruthy();
    expect(screen.getByText("No bio added yet.")).toBeTruthy();
    expect(screen.queryByText("private@example.com")).toBeNull();
    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        `/users/${publicProfile.id}`,
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  it("renders a not-found state for a missing profile", async () => {
    mockAuthenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<PublicProfilePage userId={publicProfile.id} />);

    expect(
      await screen.findByText("This profile could not be found."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Return to your workspace" })
        .getAttribute("href"),
    ).toBe("/app");
  });
});
