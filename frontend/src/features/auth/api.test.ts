import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationRequestError,
  getCurrentAccount,
  login,
  logout,
  refreshAccessToken,
  register,
} from "@/features/auth/api";

const account = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  email: "relay@example.com",
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

describe("authentication API client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let localStorage: Storage;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    localStorage = createStorageMock();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers against the backend contract and parses the account response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ user: account }, 201));

    await expect(
      register({
        email: " Relay@Example.com ",
        username: "relay_user",
        display_name: "Relay User",
        password: "a-secure-password",
      }),
    ).resolves.toEqual({ user: account });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/auth/register");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "relay@example.com",
      username: "relay_user",
      display_name: "Relay User",
      password: "a-secure-password",
    });
  });

  it("uses the HttpOnly-cookie refresh flow without reading or storing the refresh token", async () => {
    const tokenResponse = {
      access_token: "short-lived-access-token",
      token_type: "bearer",
      expires_in: 900,
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tokenResponse))
      .mockResolvedValueOnce(jsonResponse(tokenResponse));

    await login({ email: "relay@example.com", password: "a-secure-password" });
    await refreshAccessToken();

    const [, loginInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [refreshPath, refreshInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(loginInit.credentials).toBe("same-origin");
    expect(refreshPath).toBe("/auth/refresh");
    expect(refreshInit.credentials).toBe("same-origin");
    expect(refreshInit.body).toBeUndefined();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("relay_refresh_token");
  });

  it("maps backend field validation errors to form fields", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { detail: [{ loc: ["body", "username"], msg: "invalid" }] },
        422,
      ),
    );

    const request = register({
      email: "relay@example.com",
      username: "not-valid",
      display_name: "Relay User",
      password: "a-secure-password",
    });

    await expect(request).rejects.toMatchObject({
      name: "AuthenticationRequestError",
      status: 422,
      fieldErrors: {
        username: "Use 3–30 lowercase letters, numbers, or underscores.",
      },
    } satisfies Partial<AuthenticationRequestError>);
  });

  it("sends bearer tokens to the account and logout endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(account))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(getCurrentAccount("access-token")).resolves.toEqual(account);
    await expect(logout("access-token")).resolves.toBeUndefined();

    const [mePath, meInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [logoutPath, logoutInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(mePath).toBe("/auth/me");
    expect(new Headers(meInit.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(logoutPath).toBe("/auth/logout");
    expect(logoutInit.method).toBe("POST");
    expect(new Headers(logoutInit.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});

function createStorageMock(): Storage {
  return {
    length: 0,
    clear: vi.fn(),
    getItem: vi.fn(),
    key: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };
}
