import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationDetailPage } from "@/features/conversations/components/conversation-detail-page";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({
    authenticatedFetch,
    account: { id: "current-user-id" },
  }),
}));

const conversation = {
  id: "conversation-id",
  user_low_id: "current-user-id",
  user_high_id: "other-user-id",
  created_at: "2026-11-08T00:00:00Z",
};
const participant = {
  id: "other-user-id",
  username: "relay_friend",
  display_name: "Relay Friend",
  bio: null,
};

function message(
  id: string,
  senderId: string,
  content: string,
  createdAt: string,
) {
  return {
    id,
    conversation_id: "conversation-id",
    sender_id: senderId,
    content,
    status: "sent",
    created_at: createdAt,
    updated_at: createdAt,
    sent_at: createdAt,
    delivered_at: null,
    read_at: null,
    deleted_at: null,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function routeConversation(messages: unknown[], nextCursor: string | null) {
  authenticatedFetch.mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/conversations/conversation-id") {
        return Promise.resolve(jsonResponse(conversation));
      }
      if (path === "/users/other-user-id") {
        return Promise.resolve(jsonResponse(participant));
      }
      if (path.startsWith("/conversations/conversation-id/messages?")) {
        return Promise.resolve(jsonResponse({ items: messages, next_cursor: nextCursor }));
      }
      if (path === "/messages/message-own" && init?.method === "PATCH") {
        const content = JSON.parse(String(init.body)).content as string;
        const edited = {
          ...message(
            "message-own",
            "current-user-id",
            content,
            "2026-11-08T00:00:00Z",
          ),
          updated_at: "2026-11-08T02:00:00Z",
        };
        return Promise.resolve(jsonResponse(edited));
      }
      if (path === "/messages/message-own" && init?.method === "DELETE") {
        return Promise.resolve(
          jsonResponse({
            ...message(
              "message-own",
              "current-user-id",
              "",
              "2026-11-08T00:00:00Z",
            ),
            content: null,
            deleted_at: "2026-11-08T03:00:00Z",
          }),
        );
      }
      if (
        path === "/conversations/conversation-id/messages" &&
        init?.method === "POST"
      ) {
        const content = JSON.parse(String(init.body)).content as string;
        return Promise.resolve(
          jsonResponse(
            message(
              "message-new",
              "current-user-id",
              content,
              "2026-11-08T04:00:00Z",
            ),
            201,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ detail: "Not found" }, 404));
    },
  );
}

describe("ConversationDetailPage", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  it("renders history chronologically with participant and status details", async () => {
    const ownMessage = message(
      "message-own",
      "current-user-id",
      "Hello\nthere",
      "2026-11-08T00:00:00Z",
    );
    const incoming = {
      ...message(
        "message-incoming",
        "other-user-id",
        "Welcome!",
        "2026-11-08T01:00:00Z",
      ),
      status: "read",
      delivered_at: "2026-11-08T01:01:00Z",
      read_at: "2026-11-08T01:02:00Z",
    };
    routeConversation([incoming, ownMessage], null);
    render(<ConversationDetailPage conversationId="conversation-id" />);

    expect(await screen.findByText("Relay Friend")).toBeTruthy();
    const list = await screen.findByRole("list", {
      name: "Messages, oldest first",
    });
    const ownItem = within(list).getByText("Hello there").closest("li");
    const incomingItem = within(list).getByText("Welcome!").closest("li");
    expect(ownItem).toBeTruthy();
    expect(incomingItem).toBeTruthy();
    expect(
      ownItem!.compareDocumentPosition(incomingItem!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(ownItem!).getByLabelText("Message status: sent").textContent,
    ).toContain("Sent");
    expect(
      within(incomingItem!).getByLabelText("Message status: read").textContent,
    ).toContain("Read");
    expect(within(incomingItem!).queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByText("private@example.com")).toBeNull();
  });

  it("loads older history with the returned cursor and merges without duplicates", async () => {
    const latest = message(
      "latest",
      "other-user-id",
      "Latest",
      "2026-11-08T02:00:00Z",
    );
    const older = message(
      "older",
      "other-user-id",
      "Earlier",
      "2026-11-08T01:00:00Z",
    );
    authenticatedFetch.mockImplementation(
      (input: RequestInfo | URL) => {
        const path = String(input);
        if (path === "/conversations/conversation-id") {
          return Promise.resolve(jsonResponse(conversation));
        }
        if (path === "/users/other-user-id") {
          return Promise.resolve(jsonResponse(participant));
        }
        if (path.endsWith("cursor=opaque-cursor")) {
          return Promise.resolve(
            jsonResponse({ items: [older, latest], next_cursor: null }),
          );
        }
        if (path.includes("/messages?")) {
          return Promise.resolve(
            jsonResponse({ items: [latest], next_cursor: "opaque-cursor" }),
          );
        }
        return Promise.resolve(jsonResponse({ detail: "Not found" }, 404));
      },
    );
    render(<ConversationDetailPage conversationId="conversation-id" />);

    expect(await screen.findByText("Latest")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load older messages" }));

    const earlierMessage = await screen.findByText("Earlier");
    expect(earlierMessage).toBeTruthy();
    expect(screen.getAllByText("Latest")).toHaveLength(1);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations/conversation-id/messages?limit=50&cursor=opaque-cursor",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("sends on Enter, preserves Shift+Enter, and displays the sent status", async () => {
    routeConversation([], null);
    render(<ConversationDetailPage conversationId="conversation-id" />);
    const composer = await screen.findByRole("textbox", {
      name: "Write a message",
    });

    fireEvent.change(composer, { target: { value: "A multiline message" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
    expect(
      authenticatedFetch.mock.calls.some(
        ([path, init]) =>
          path === "/conversations/conversation-id/messages" &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);

    fireEvent.keyDown(composer, { key: "Enter" });
    expect(await screen.findByText("A multiline message")).toBeTruthy();
    expect(
      screen.getByLabelText("Message status: sent").textContent,
    ).toContain("Sent");
    expect(
      authenticatedFetch.mock.calls.some(
        ([path, init]) =>
          path === "/conversations/conversation-id/messages" &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(true);
  });

  it("allows editing and soft deletion of the current user's messages", async () => {
    routeConversation(
      [
        message(
          "message-own",
          "current-user-id",
          "Original",
          "2026-11-08T00:00:00Z",
        ),
      ],
      null,
    );
    render(<ConversationDetailPage conversationId="conversation-id" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const edit = screen.getByRole("textbox", { name: "Edit message" });
    fireEvent.change(edit, { target: { value: "Updated message" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));
    expect(await screen.findByText("Updated message")).toBeTruthy();
    expect(screen.getByText("Edited")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByText("Message deleted")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await waitFor(() => {
      expect(
        authenticatedFetch.mock.calls.some(
          ([path, init]) =>
            path === "/messages/message-own" &&
            (init as RequestInit | undefined)?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });

  it("shows loading and retry states for history failures", async () => {
    authenticatedFetch.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/conversations/conversation-id") {
        return Promise.resolve(jsonResponse(conversation));
      }
      if (path === "/users/other-user-id") {
        return Promise.resolve(jsonResponse(participant));
      }
      if (path.includes("/messages?")) {
        return Promise.reject(new TypeError("network unavailable"));
      }
      return Promise.resolve(jsonResponse({ detail: "Not found" }, 404));
    });
    render(<ConversationDetailPage conversationId="conversation-id" />);

    expect(
      await screen.findByText("Messages could not load"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
