import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, AuthProvider } from "@/features/auth/providers/auth-provider";

const account = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  email: "relay@example.com",
  username: "relay_user",
  display_name: "Relay User",
  bio: null,
  created_at: "2026-11-07T00:00:00Z",
  updated_at: "2026-11-07T00:00:00Z",
};

const firstToken = {
  access_token: "first-access-token",
  token_type: "bearer",
  expires_in: 900,
};

const refreshedToken = {
  access_token: "refreshed-access-token",
  token_type: "bearer",
  expires_in: 900,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function responseFor(path: string, init?: RequestInit): Response {
  if (path === "/auth/refresh") {
    return jsonResponse(firstToken);
  }
  if (path === "/auth/me") {
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer ${firstToken.access_token}`,
    );
    return jsonResponse(account);
  }
  if (path === "/auth/logout") {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 404 });
}

describe("AuthProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let localStorage: Storage;

  beforeEach(() => {
    localStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorage,
    });
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path =
        input instanceof Request
          ? new URL(input.url).pathname
          : new URL(input.toString(), window.location.origin).pathname;
      return Promise.resolve(responseFor(path, init));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("restores the account from the refresh cookie without persisting tokens", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });
    expect(result.current.accessToken).toBe(firstToken.access_token);
    expect(result.current.account).toEqual(account);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("relay_refresh_token");

    const [refreshCallPath, refreshInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(refreshCallPath).toBe("/auth/refresh");
    expect(refreshInit.credentials).toBe("same-origin");
  });

  it("signs in with the backend token and loads the current account", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "No refresh token" }, 401),
    );
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(firstToken))
      .mockResolvedValueOnce(jsonResponse(account));
    await act(async () => {
      await result.current.signIn({
        email: account.email,
        password: "a-secure-password",
      });
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.account).toEqual(account);
    const [loginPath, loginInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(loginPath).toBe("/auth/login");
    expect(JSON.parse(loginInit.body as string)).toEqual({
      email: account.email,
      password: "a-secure-password",
    });
  });

  it("renews the access token before the backend expiry time", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...firstToken, expires_in: 61 }),
    );
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(refreshedToken));

    await waitFor(
      () => {
        expect(result.current.accessToken).toBe(
          refreshedToken.access_token,
        );
      },
      { timeout: 4_000 },
    );

    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/auth/refresh"),
    ).toHaveLength(2);
  });

  it("refreshes and retries a protected request once after an expired access token", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse(refreshedToken))
      .mockResolvedValueOnce(jsonResponse({ id: "private-resource" }));

    let response: Response | undefined;
    await act(async () => {
      response = await result.current.authenticatedFetch("/users/me");
    });

    expect(response?.status).toBe(200);
    expect(result.current.accessToken).toBe(refreshedToken.access_token);
    const protectedRequests = fetchMock.mock.calls
      .map(([input]) => input)
      .filter((input): input is Request => input instanceof Request);
    expect(protectedRequests).toHaveLength(2);
    expect(protectedRequests[0].headers.get("Authorization")).toBe(
      `Bearer ${firstToken.access_token}`,
    );
    expect(protectedRequests[1].headers.get("Authorization")).toBe(
      `Bearer ${refreshedToken.access_token}`,
    );
  });

  it("revokes the server session and clears in-memory state on logout", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.accessToken).toBeNull();
    expect(result.current.account).toBeNull();
    const [logoutPath, logoutInit] = fetchMock.mock.calls.at(-1) as [
      string,
      RequestInit,
    ];
    expect(logoutPath).toBe("/auth/logout");
    expect(new Headers(logoutInit.headers).get("Authorization")).toBe(
      `Bearer ${firstToken.access_token}`,
    );
  });
});
