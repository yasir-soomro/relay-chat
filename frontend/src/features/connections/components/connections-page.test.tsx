import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionsPage } from "@/features/connections/components/connections-page";
import { ConnectionsProvider } from "@/features/connections/providers/connections-provider";
import type { ConnectionRecord } from "@/features/connections/types";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({
    authenticatedFetch,
    account: { id: "current-user-id" },
  }),
}));

const incomingRequest = {
  id: "request-id",
  requester_id: "other-user-id",
  recipient_id: "current-user-id",
  status: "pending",
  requested_at: "2026-11-08T00:00:00Z",
  responded_at: null,
  rejected_at: null,
  removed_at: null,
};

const publicProfile = {
  id: "other-user-id",
  username: "relay_friend",
  display_name: "Relay Friend",
  bio: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderConnectionsPage() {
  return render(
    <ConnectionsProvider>
      <ConnectionsPage />
    </ConnectionsProvider>,
  );
}

describe("ConnectionsPage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  it("supports keyboard navigation between the accessible connection tabs", async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [] })),
    );
    renderConnectionsPage();

    expect(await screen.findByText("No incoming requests")).toBeTruthy();
    const incomingTab = screen.getByRole("tab", { name: /Incoming/ });
    const outgoingTab = screen.getByRole("tab", { name: /Outgoing/ });

    fireEvent.keyDown(incomingTab, { key: "ArrowRight" });

    expect(outgoingTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(outgoingTab);
    expect(screen.getByRole("heading", { name: "Connection requests" })).toBeTruthy();
    expect(await screen.findByText("No sent requests")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Connections/ }));
    expect(await screen.findByText("No connections yet")).toBeTruthy();
  });

  it("cancels a sent request through the existing connection API", async () => {
    const outgoingRequest: ConnectionRecord = {
      id: "outgoing-request-id",
      requester_id: "current-user-id",
      recipient_id: publicProfile.id,
      status: "pending",
      requested_at: "2026-11-08T00:00:00Z",
      responded_at: null,
      rejected_at: null,
      removed_at: null,
    };
    let activeRequest: typeof outgoingRequest | null = outgoingRequest;
    authenticatedFetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        const method = init?.method ?? "GET";
        if (path === "/connections/requests/outgoing") {
          return jsonResponse({
            items: activeRequest?.status === "pending" ? [activeRequest] : [],
          });
        }
        if (path === `/users/${publicProfile.id}`) {
          return jsonResponse(publicProfile);
        }
        if (
          path === `/connections/requests/${outgoingRequest.id}` &&
          method === "DELETE"
        ) {
          activeRequest = {
            ...outgoingRequest,
            status: "removed",
            removed_at: "2026-11-08T00:01:00Z",
          };
          return jsonResponse(activeRequest);
        }
        return jsonResponse({ items: [] });
      },
    );
    renderConnectionsPage();

    expect(await screen.findByText("No incoming requests")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Outgoing/ }));
    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Request" }));

    expect(await screen.findByText("No sent requests")).toBeTruthy();
    expect(
      authenticatedFetch.mock.calls.some(
        ([path, init]) =>
          path === `/connections/requests/${outgoingRequest.id}` &&
          init?.method === "DELETE",
      ),
    ).toBe(true);
    expect(screen.getByText("Connection request canceled.")).toBeTruthy();
  });

  it("shows a retryable error when the connection lists cannot be loaded", async () => {
    let shouldFail = true;
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(
        shouldFail
          ? jsonResponse({ detail: "Unavailable" }, 503)
          : jsonResponse({ items: [] }),
      ),
    );
    renderConnectionsPage();

    expect(
      await screen.findByText("Relay is temporarily unavailable. Please try again shortly."),
    ).toBeTruthy();
    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No incoming requests")).toBeTruthy();
  });

  it("accepts incoming requests and moves them out of the pending list", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/connections/requests/incoming") {
        return Promise.resolve(jsonResponse({ items: [incomingRequest] }));
      }
      if (path === `/users/${publicProfile.id}`) {
        return Promise.resolve(jsonResponse(publicProfile));
      }
      if (path.endsWith("/accept")) {
        return Promise.resolve(
          jsonResponse({ ...incomingRequest, status: "accepted" }),
        );
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });
    renderConnectionsPage();

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(await screen.findByText("No incoming requests")).toBeTruthy();
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByText("Connection request accepted.")).toBeTruthy();
  });

  it("removes rejected requests and gives immediate, temporary feedback", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/connections/requests/incoming") {
        return Promise.resolve(jsonResponse({ items: [incomingRequest] }));
      }
      if (path === `/users/${publicProfile.id}`) {
        return Promise.resolve(jsonResponse(publicProfile));
      }
      if (path.endsWith("/reject")) {
        return Promise.resolve(
          jsonResponse({ ...incomingRequest, status: "rejected" }),
        );
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });
    renderConnectionsPage();

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.getByText("No incoming requests")).toBeTruthy();
      expect(screen.getByText("Connection request declined.")).toBeTruthy();
    });
    expect(
      authenticatedFetch.mock.calls.some(([input]) =>
        String(input).includes("rejected"),
      ),
    ).toBe(false);
  });
});
