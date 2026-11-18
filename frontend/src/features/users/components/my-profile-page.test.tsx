import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyProfilePage } from "@/features/users/components/my-profile-page";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ authenticatedFetch }),
}));

const profile = {
  id: "profile-id",
  email: "private@example.com",
  username: "relay_user",
  display_name: "Relay User",
  bio: "A short profile bio.",
  created_at: "2026-11-07T00:00:00Z",
  updated_at: "2026-11-07T00:00:00Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MyProfilePage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse(profile)),
    );
  });

  it("opens in read-only mode and enters edit mode on request", async () => {
    render(<MyProfilePage />);

    expect(await screen.findByText("Relay User")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeTruthy();
    expect(screen.queryByLabelText("Full name")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(await screen.findByLabelText("Full name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  });

  it("cancels edits without making an API request and restores saved values", async () => {
    render(<MyProfilePage />);
    await screen.findByText("Relay User");
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "Unsaved Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Relay User")).toBeTruthy();
    expect(screen.queryByText("Unsaved Name")).toBeNull();
    expect(screen.queryByLabelText("Full name")).toBeNull();
    expect(
      authenticatedFetch.mock.calls.filter(
        ([, init]) => init?.method === "PATCH",
      ),
    ).toHaveLength(0);
  });

  it("saves through the existing profile API, refreshes the view, and exits edit mode", async () => {
    const updatedProfile = {
      ...profile,
      display_name: "Updated Relay",
      updated_at: "2026-11-18T00:00:00Z",
    };
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/users/me" && init?.method === "PATCH") {
          return Promise.resolve(jsonResponse(updatedProfile));
        }
        return Promise.resolve(jsonResponse(profile));
      },
    );
    render(<MyProfilePage />);
    await screen.findByText("Relay User");
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "Updated Relay" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Your profile has been updated.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Updated Relay" })).toBeTruthy();
    expect(screen.queryByLabelText("Full name")).toBeNull();
    expect(
      authenticatedFetch.mock.calls.some(
        ([input, init]) =>
          String(input) === "/users/me" &&
          init?.method === "PATCH" &&
          init.body ===
            JSON.stringify({
              username: "relay_user",
              display_name: "Updated Relay",
              bio: "A short profile bio.",
            }),
      ),
    ).toBe(true);
  });
});
