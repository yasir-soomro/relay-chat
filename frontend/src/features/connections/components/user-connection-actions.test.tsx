import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { ConnectionsProvider } from "@/features/connections/providers/connections-provider";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ authenticatedFetch }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderActions() {
  return render(
    <ConnectionsProvider>
      <UserConnectionActions
        displayName="Relay Friend"
        userId="other-user-id"
      />
    </ConnectionsProvider>,
  );
}

describe("UserConnectionActions", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  it("blocks and immediately offers an unblock action, then confirms unblocking", async () => {
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        const method = init?.method ?? "GET";
        if (path === "/connections/other-user-id/block" && method === "POST") {
          return Promise.resolve(
            jsonResponse({
              blocked_user_id: "other-user-id",
              created_at: "2026-11-08T00:00:00Z",
            }),
          );
        }
        if (path === "/connections/other-user-id/block" && method === "DELETE") {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );
    renderActions();

    fireEvent.click(await screen.findByRole("button", { name: "Block" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("button", { name: "Unblock" })).toBeTruthy();
    expect(screen.getByText("Member blocked. You can unblock them here.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Unblock Relay Friend" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
    });
    expect(screen.getByText("Member unblocked.")).toBeTruthy();
  });

  it("reports when an unblock target is no longer available", async () => {
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        const method = init?.method ?? "GET";
        if (path === "/connections/other-user-id/block" && method === "POST") {
          return Promise.resolve(
            jsonResponse({
              blocked_user_id: "other-user-id",
              created_at: "2026-11-08T00:00:00Z",
            }),
          );
        }
        if (path === "/connections/other-user-id/block" && method === "DELETE") {
          return Promise.resolve(
            jsonResponse({ detail: "Block not found" }, 404),
          );
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );
    renderActions();

    fireEvent.click(await screen.findByRole("button", { name: "Block" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Unblock Relay Friend" }),
    );

    expect(
      await screen.findByText("This unblock target is no longer available."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Unblock Relay Friend" })).toBeNull();
  });

  it("shows a clear cooldown error returned by the backend", async () => {
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/connections/requests/incoming") {
          return Promise.resolve(jsonResponse({ items: [] }));
        }
        if (String(input) === "/connections/requests/outgoing") {
          return Promise.resolve(jsonResponse({ items: [] }));
        }
        if (String(input) === "/connections") {
          return Promise.resolve(jsonResponse({ items: [] }));
        }
        if (String(input) === "/connections/requests" && init?.method === "POST") {
          return Promise.resolve(
            jsonResponse(
              { detail: "Connection request cooldown has not elapsed" },
              409,
            ),
          );
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );
    renderActions();

    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));

    expect(
      await screen.findByText(
        "You need to wait before sending another request to this member.",
      ),
    ).toBeTruthy();
  });
});
