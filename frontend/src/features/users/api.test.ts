import { describe, expect, it, vi } from "vitest";
import {
  discoverUsers,
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  UserRequestError,
} from "@/features/users/api";

const ownProfile = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  email: "private@example.com",
  username: "relay_user",
  display_name: "Relay User",
  bio: null,
  created_at: "2026-11-07T00:00:00Z",
  updated_at: "2026-11-07T00:00:00Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("user profile API", () => {
  it("uses the discovery endpoint and only the approved cursor response fields", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: ownProfile.id,
            username: ownProfile.username,
            display_name: ownProfile.display_name,
            bio: ownProfile.bio,
            email: ownProfile.email,
          },
        ],
        next_cursor: "relay_user",
      }),
    );

    await expect(
      discoverUsers(authenticatedFetch, { q: "Relay", limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          id: ownProfile.id,
          username: ownProfile.username,
          display_name: ownProfile.display_name,
          bio: null,
        },
      ],
      next_cursor: "relay_user",
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/api/v1/users/discover?limit=20&q=Relay",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("sends the returned cursor and accepts null as the end of results", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));

    await expect(
      discoverUsers(authenticatedFetch, {
        q: "relay",
        limit: 20,
        cursor: "relay_user",
      }),
    ).resolves.toEqual({ items: [], next_cursor: null });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/api/v1/users/discover?limit=20&q=relay&cursor=relay_user",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects discovery responses without next_cursor", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [] }));

    await expect(
      discoverUsers(authenticatedFetch, {}),
    ).rejects.toMatchObject({
      name: "UserRequestError",
      status: 502,
    } satisfies Partial<UserRequestError>);
  });

  it("rejects invalid username searches without making a request", async () => {
    const authenticatedFetch = vi.fn();

    await expect(
      discoverUsers(authenticatedFetch, { q: "relay user" }),
    ).rejects.toMatchObject({
      name: "UserRequestError",
      status: 422,
      message: "Search using 1–30 letters, numbers, or underscores.",
    } satisfies Partial<UserRequestError>);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });

  it("loads the current account from the backend account endpoint", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(jsonResponse(ownProfile));

    await expect(getMyProfile(authenticatedFetch)).resolves.toEqual(ownProfile);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("strips private fields from public profile responses", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(jsonResponse(ownProfile));

    await expect(
      getPublicProfile(authenticatedFetch, ownProfile.id),
    ).resolves.toEqual({
      id: ownProfile.id,
      username: ownProfile.username,
      display_name: ownProfile.display_name,
      bio: null,
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      `/users/${ownProfile.id}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("patches the owner profile and sends an empty bio as null", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(
      jsonResponse({ ...ownProfile, username: "new_username", bio: null }),
    );

    await updateMyProfile(authenticatedFetch, {
      username: "new_username",
      display_name: "Updated Name",
      bio: "",
    });

    const [, init] = authenticatedFetch.mock.calls[0];
    expect(init).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(init.body as string)).toEqual({
      username: "new_username",
      display_name: "Updated Name",
      bio: null,
    });
  });

  it("maps backend username conflicts to a field-level error", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "User username already exists" }, 409));

    await expect(
      updateMyProfile(authenticatedFetch, {
        username: "already_used",
        display_name: "Relay User",
        bio: "",
      }),
    ).rejects.toMatchObject({
      name: "UserRequestError",
      status: 409,
      fieldErrors: { username: "That username is already in use." },
    } satisfies Partial<UserRequestError>);
  });

  it("shows a clear message when the profile API cannot be reached", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getMyProfile(authenticatedFetch)).rejects.toMatchObject({
      name: "UserRequestError",
      status: 0,
      message: "Relay could not be reached. Check your connection and try again.",
    } satisfies Partial<UserRequestError>);
  });
});
