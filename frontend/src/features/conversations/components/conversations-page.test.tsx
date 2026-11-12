import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationsPage } from "@/features/conversations/components/conversations-page";
import { ConversationDetailPage } from "@/features/conversations/components/conversation-detail-page";
import { ConnectionsProvider } from "@/features/connections/providers/connections-provider";

const { authenticatedFetch, push } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({
    authenticatedFetch,
    account: { id: "current-user-id" },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const conversation = {
  id: "conversation-id",
  user_low_id: "current-user-id",
  user_high_id: "other-user-id",
  created_at: "2026-11-08T00:00:00Z",
  unread_count: 0,
};
const connection = {
  id: "connection-id",
  requester_id: "current-user-id",
  recipient_id: "other-user-id",
  status: "accepted",
  requested_at: "2026-11-08T00:00:00Z",
  responded_at: "2026-11-08T00:00:00Z",
  rejected_at: null,
  removed_at: null,
};
const profile = {
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

function renderInbox() {
  return render(
    <ConnectionsProvider>
      <ConversationsPage />
    </ConnectionsProvider>,
  );
}

describe("ConversationsPage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
    push.mockReset();
  });

  it("loads the inbox, shows public participant details, and links to the conversation", async () => {
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        if (path === "/connections") {
          return Promise.resolve(jsonResponse({ items: [connection] }));
        }
        if (path === "/conversations" && !init?.method) {
          return Promise.resolve(jsonResponse({ items: [conversation] }));
        }
        if (path === "/users/other-user-id") {
          return Promise.resolve(jsonResponse(profile));
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );

    renderInbox();

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    expect(screen.getByText("@relay_friend")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open conversation with Relay Friend" })
        .getAttribute("href"),
    ).toBe("/conversations/conversation-id");
    expect(screen.queryByText("private@example.com")).toBeNull();
  });

  it("creates or retrieves a conversation for an accepted connection and opens it", async () => {
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        if (path === "/connections") {
          return Promise.resolve(jsonResponse({ items: [connection] }));
        }
        if (path === "/conversations" && init?.method === "POST") {
          return Promise.resolve(jsonResponse(conversation, 201));
        }
        if (path === "/users/other-user-id") {
          return Promise.resolve(jsonResponse(profile));
        }
        return Promise.resolve(jsonResponse({ items: [] }));
      },
    );
    renderInbox();

    fireEvent.click(
      await screen.findByRole("button", { name: "Start conversation" }),
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/conversations/conversation-id");
      expect(
        authenticatedFetch.mock.calls.some(
          ([path, init]) =>
            path === "/conversations" &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });
  });

  it("shows a retry action when loading the inbox fails", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/conversations") {
        return Promise.reject(new TypeError("network unavailable"));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });
    renderInbox();

    expect(
      await screen.findByText(
        "Relay could not be reached. Check your connection and try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("shows the empty inbox state for a valid empty conversation list", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/connections") {
        return Promise.resolve(jsonResponse({ items: [connection] }));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });

    renderInbox();

    expect(await screen.findByText("No conversations yet")).toBeTruthy();
  });

  it("retries the inbox after rejecting a response that misses unread_count", async () => {
    let conversationRequests = 0;
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/connections") {
        return Promise.resolve(jsonResponse({ items: [connection] }));
      }
      if (path === "/conversations") {
        conversationRequests += 1;
        return Promise.resolve(
          jsonResponse({
            items:
              conversationRequests === 1
                ? [{ id: conversation.id }]
                : [conversation],
          }),
        );
      }
      if (path === "/users/other-user-id") {
        return Promise.resolve(jsonResponse(profile));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });

    renderInbox();

    expect(
      await screen.findByText(
        "Relay returned an unexpected conversation list. Please try again.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    expect(conversationRequests).toBe(2);
  });
});

describe("ConversationDetailPage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  it("retrieves a conversation and shows the other participant", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/conversations/conversation-id") {
        return Promise.resolve(jsonResponse(conversation));
      }
      if (path === "/users/other-user-id") {
        return Promise.resolve(jsonResponse(profile));
      }
      if (path.startsWith("/conversations/conversation-id/messages?")) {
        return Promise.resolve(jsonResponse({ items: [], next_cursor: null }));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });
    render(<ConversationDetailPage conversationId="conversation-id" />);

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    expect(await screen.findByText("A fresh start"))
      .toBeTruthy();
  });

  it("shows a not-found detail response and retries retrieval", async () => {
    let detailRequests = 0;
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/conversations/conversation-id") {
        detailRequests += 1;
        return Promise.resolve(
          detailRequests === 1
            ? jsonResponse({ detail: "Conversation or user not found" }, 404)
            : jsonResponse(conversation),
        );
      }
      if (path === "/users/other-user-id") {
        return Promise.resolve(jsonResponse(profile));
      }
      if (path.startsWith("/conversations/conversation-id/messages?")) {
        return Promise.resolve(jsonResponse({ items: [], next_cursor: null }));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });

    render(<ConversationDetailPage conversationId="conversation-id" />);

    expect(
      await screen.findByText(
        "This conversation or member is no longer available.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    expect(detailRequests).toBe(2);
  });
});
