import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDiscoveryPage } from "@/features/users/components/user-discovery-page";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ authenticatedFetch }),
}));

vi.mock("@/features/connections/components/user-connection-actions", () => ({
  UserConnectionActions: () => <div>Connection actions</div>,
}));

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const firstProfile = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  username: "relay_one",
  display_name: "Relay One",
  bio: "A first profile",
};

const secondProfile = {
  id: "76c2b9b5-d999-4806-a07e-bb3d4d738c2b",
  username: "relay_two",
  display_name: "Relay Two",
  bio: null,
};

describe("UserDiscoveryPage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  it("loads cursor pages, links public profiles, and stops when next_cursor is null", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(
        jsonResponse({ items: [firstProfile], next_cursor: "relay_one" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [secondProfile], next_cursor: null }),
      );
    render(<UserDiscoveryPage />);

    expect(await screen.findByText("Relay One")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View Relay One's profile" }).getAttribute("href"))
      .toBe(`/app/users/${firstProfile.id}`);
    expect(screen.queryByText("private@example.com")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    });

    expect(await screen.findByText("Relay Two")).toBeTruthy();
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/users/discover?limit=20&cursor=relay_one",
      expect.objectContaining({ method: "GET" }),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows a retry state after an initial request fails", async () => {
    authenticatedFetch
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(
        jsonResponse({ items: [firstProfile], next_cursor: null }),
      );
    render(<UserDiscoveryPage />);

    expect(
      await screen.findByText(
        "Relay could not be reached. Check your connection and try again.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("Relay One")).toBeTruthy();
    });
  });
});
