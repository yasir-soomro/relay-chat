import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  NotificationsProvider,
  useNotifications,
} from "@/features/notifications/providers/notifications-provider";
import { MessagingRealtimeContext } from "@/features/messaging/providers/messaging-provider";
import { WebSocketConnectionManager } from "@/features/messaging/websocket/connection-manager";
import type { WebSocketTransport } from "@/features/messaging/websocket/websocket-client";

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: vi.fn(),
}));

const currentAccount = {
  id: "current-user",
  email: "current@example.com",
  username: "current_user",
  display_name: "Current User",
  bio: null,
  created_at: "2026-11-09T09:00:00Z",
  updated_at: "2026-11-09T09:00:00Z",
};
let authValue: ReturnType<typeof useAuth>;

class FakeSocket implements WebSocketTransport {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readonly frames: string[] = [];

  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  send(frame: string) {
    this.frames.push(frame);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }

  receive(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }

  parsedFrames() {
    return this.frames.map(
      (frame) => JSON.parse(frame) as Record<string, unknown>,
    );
  }
}

const unreadMessage = {
  id: "unread-message",
  conversation_id: "conversation-one",
  sender_id: "other-user",
  content: "Private message contents are never shown as notification text",
  status: "sent",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
  sent_at: "2026-11-09T10:00:00Z",
  delivered_at: null,
  read_at: null,
  deleted_at: null,
};
let unreadCount = 1;
const receivedEvent = {
  type: "message.received",
  message: unreadMessage,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function NotificationSummary() {
  const { items, unreadCount, isLoading, error } = useNotifications();
  return (
    <div>
      <span>{isLoading ? "Loading" : "Ready"}</span>
      <span>{unreadCount} total</span>
      <span>{items[0]?.unreadCount ?? 0} conversation unread</span>
      <span>{error}</span>
    </div>
  );
}

describe("NotificationsProvider", () => {
  beforeEach(() => {
    unreadCount = 1;
    const authenticatedFetch: ReturnType<typeof useAuth>["authenticatedFetch"] =
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input);
        if (path === "/conversations") {
          return jsonResponse({
            items: [
              {
                id: "conversation-one",
                user_low_id: "current-user",
                user_high_id: "other-user",
                created_at: "2026-11-09T09:00:00Z",
                unread_count: unreadCount,
              },
            ],
          });
        }
        if (path === "/api/v1/notifications/unread-count") {
          return jsonResponse({ total_unread_count: unreadCount });
        }
        return new Response(null, { status: 404 });
      });
    authValue = {
      accessToken: "access-token",
      account: currentAccount,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      getFreshAccessToken: vi.fn(),
      authenticatedFetch,
      status: "authenticated",
    };
    vi.mocked(useAuth).mockReturnValue(authValue);
  });

  it("loads counts when authentication is restored", async () => {
    const manager = new WebSocketConnectionManager();
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MessagingRealtimeContext.Provider
          value={{ manager, state: "offline" }}
        >
          <NotificationsProvider>{children}</NotificationsProvider>
        </MessagingRealtimeContext.Provider>
      );
    }

    authValue = { ...authValue, account: null, status: "loading" };
    vi.mocked(useAuth).mockReturnValue(authValue);
    const { rerender } = render(<NotificationSummary />, { wrapper: Wrapper });
    expect(authValue.authenticatedFetch).not.toHaveBeenCalledWith(
      "/api/v1/notifications/unread-count",
      expect.anything(),
    );

    authValue = {
      ...authValue,
      account: currentAccount,
      status: "authenticated",
    };
    vi.mocked(useAuth).mockReturnValue(authValue);
    rerender(
      <Wrapper>
        <NotificationSummary />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("1 total")).toBeTruthy();
      expect(authValue.authenticatedFetch).toHaveBeenCalledWith(
        "/api/v1/notifications/unread-count",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("updates immediately, deduplicates messages, ignores own messages, and syncs reads", async () => {
    const socket = new FakeSocket();
    const manager = new WebSocketConnectionManager({
      createSocket: () => socket,
      getUrl: () => "wss://relay.test/ws",
    });
    manager.setAuthentication("access-token", async () => null, "current-user");
    socket.open();
    socket.receive({ type: "auth.ok", user_id: "current-user" });
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MessagingRealtimeContext.Provider
          value={{ manager, state: "connected" }}
        >
          <NotificationsProvider>{children}</NotificationsProvider>
        </MessagingRealtimeContext.Provider>
      );
    }

    render(<NotificationSummary />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        socket.parsedFrames().some((event) => event.type === "subscribe"),
      ).toBe(true),
    );
    act(() => {
      socket.receive({
        type: "subscribed",
        conversation_id: "conversation-one",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("1 total")).toBeTruthy();
      expect(screen.getByText("1 conversation unread")).toBeTruthy();
    });
    expect(screen.queryByText("New message")).toBeNull();
    expect(authValue.authenticatedFetch).toHaveBeenCalledWith(
      "/api/v1/notifications/unread-count",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(screen.queryByText(unreadMessage.content)).toBeNull();
    expect(authValue.authenticatedFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/messages?"),
      expect.anything(),
    );

    act(() => {
      socket.receive({
        type: "message.sent",
        client_message_id: "client-message-id",
        message: {
          ...unreadMessage,
          id: "sent-message",
          sender_id: "current-user",
        },
      });
      socket.receive({
        type: "message.received",
        message: {
          ...unreadMessage,
          id: "own-message",
          sender_id: "current-user",
        },
      });
    });
    expect(screen.getByText("1 total")).toBeTruthy();
    expect(screen.queryByText("New message")).toBeNull();

    const newMessage = { ...unreadMessage, id: "new-message" };
    unreadCount = 2;
    act(() => {
      socket.receive({ ...receivedEvent, message: newMessage });
      socket.receive({ ...receivedEvent, message: newMessage });
    });
    expect(screen.getByText("2 total")).toBeTruthy();
    expect(screen.getByText("2 conversation unread")).toBeTruthy();
    expect(screen.getAllByText("New message")).toHaveLength(1);
    expect(
      screen
        .getByRole("link", { name: "Open conversation with a new message" })
        .getAttribute("href"),
    ).toBe("/conversations/conversation-one");
    await waitFor(() => {
      expect(screen.getByText("2 total")).toBeTruthy();
      expect(screen.getAllByText("New message")).toHaveLength(1);
    });

    unreadCount = 1;
    act(() => {
      socket.receive({
        type: "message.status",
        conversation_id: "conversation-one",
        status: {
          id: "new-message",
          status: "read",
          sent_at: newMessage.sent_at,
          delivered_at: "2026-11-09T10:01:00Z",
          read_at: "2026-11-09T10:02:00Z",
        },
      });
    });
    expect(screen.queryByText("New message")).toBeNull();
    await waitFor(() => {
      expect(screen.getByText("1 total")).toBeTruthy();
      expect(screen.getByText("1 conversation unread")).toBeTruthy();
    });

    unreadCount = 3;
    act(() => {
      socket.receive({
        type: "subscribed",
        conversation_id: "conversation-one",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("3 total")).toBeTruthy();
      expect(screen.getByText("3 conversation unread")).toBeTruthy();
    });
    manager.setAuthentication(null, null);
  });
});
