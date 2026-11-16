import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { ConnectionsProvider } from "@/features/connections/providers/connections-provider";
import type { ConnectionRecord } from "@/features/connections/types";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

type ActionOptions = {
  compact?: boolean;
  showBlock?: boolean;
  allowCancelRequest?: boolean;
};

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ authenticatedFetch }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderActions(options: ActionOptions = {}) {
  return render(
    <ConnectionsProvider>
      <UserConnectionActions
        displayName="Relay Friend"
        userId="other-user-id"
        {...options}
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
          const retryAt = "2026-11-15T00:00:00Z";
          return Promise.resolve(
            jsonResponse({
              detail: {
                code: "connection_request_cooldown_active",
                retry_at: retryAt,
              },
            }, 409),
          );
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );
    renderActions();

    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));

    expect(
      await screen.findByText(
        `You can send another request after ${new Date("2026-11-15T00:00:00Z").toLocaleString()}.`,
      ),
    ).toBeTruthy();
  });

  it("sends, cancels, and resends an outgoing request from a discovery card", async () => {
    const request: ConnectionRecord = {
      id: "request-id",
      requester_id: "current-user-id",
      recipient_id: "other-user-id",
      status: "pending",
      requested_at: "2026-11-08T00:00:00Z",
      responded_at: null,
      rejected_at: null,
      removed_at: null,
    };
    let outgoingRequest: typeof request | null = null;
    authenticatedFetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        const method = init?.method ?? "GET";
        if (path === "/connections/requests/incoming") {
          return jsonResponse({ items: [] });
        }
        if (path === "/connections/requests/outgoing") {
          return jsonResponse({
            items: outgoingRequest?.status === "pending" ? [outgoingRequest] : [],
          });
        }
        if (path === "/connections") {
          return jsonResponse({ items: [] });
        }
        if (path === "/connections/requests" && method === "POST") {
          outgoingRequest = request;
          return jsonResponse(request, 201);
        }
        if (
          path === `/connections/requests/${request.id}` &&
          method === "DELETE"
        ) {
          outgoingRequest = { ...request, status: "removed", removed_at: "2026-11-08T00:01:00Z" };
          return jsonResponse(outgoingRequest);
        }
        return jsonResponse({ detail: "Not found" }, 404);
      },
    );
    renderActions({
      allowCancelRequest: true,
      compact: true,
      showBlock: false,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));
    expect(
      await screen.findByRole("button", { name: "Cancel Request" }),
    ).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel Request" }));
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(
      await screen.findByRole("button", { name: "Cancel Request" }),
    ).toBeTruthy();
    expect(
      authenticatedFetch.mock.calls.filter(
        ([path, init]) =>
          path === `/connections/requests/${request.id}` &&
          init?.method === "DELETE",
      ),
    ).toHaveLength(1);
    expect(
      authenticatedFetch.mock.calls.filter(
        ([path, init]) =>
          path === "/connections/requests" && init?.method === "POST",
      ),
    ).toHaveLength(2);
  });

  it("shows Connected without removing block actions from other views", async () => {
    const accepted = {
      id: "accepted-id",
      requester_id: "current-user-id",
      recipient_id: "other-user-id",
      status: "accepted",
      requested_at: "2026-11-08T00:00:00Z",
      responded_at: "2026-11-08T00:01:00Z",
      rejected_at: null,
      removed_at: null,
    };
    authenticatedFetch.mockImplementation(
      async (input: RequestInfo | URL) =>
        String(input) === "/connections"
          ? jsonResponse({ items: [accepted] })
          : jsonResponse({ items: [] }),
    );
    renderActions({
      allowCancelRequest: true,
      compact: true,
      showBlock: false,
    });

    expect(await screen.findByText("Connected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove connection" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();
  });

  it("keeps incoming-request decisions while hiding Block on discovery cards", async () => {
    const incoming = {
      id: "incoming-id",
      requester_id: "other-user-id",
      recipient_id: "current-user-id",
      status: "pending",
      requested_at: "2026-11-08T00:00:00Z",
      responded_at: null,
      rejected_at: null,
      removed_at: null,
    };
    authenticatedFetch.mockImplementation(
      async (input: RequestInfo | URL) =>
        String(input) === "/connections/requests/incoming"
          ? jsonResponse({ items: [incoming] })
          : jsonResponse({ items: [] }),
    );
    renderActions({
      allowCancelRequest: true,
      compact: true,
      showBlock: false,
    });

    expect(await screen.findByText("Pending")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();
  });
});
