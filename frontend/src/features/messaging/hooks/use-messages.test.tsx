import { act, renderHook, waitFor } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useMessages } from "@/features/messaging/hooks/use-messages";
import {
  MessagingRealtimeContext,
} from "@/features/messaging/providers/messaging-provider";
import {
  WebSocketConnectionManager,
  type ConnectionState,
} from "@/features/messaging/websocket/connection-manager";
import type { WebSocketTransport } from "@/features/messaging/websocket/websocket-client";

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

  receive(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }

  send(frame: string) {
    this.frames.push(frame);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }

  parsedFrames() {
    return this.frames.map((frame) => JSON.parse(frame) as Record<string, unknown>);
  }
}

const incomingMessage = {
  id: "incoming-id",
  conversation_id: "conversation-id",
  sender_id: "other-user",
  content: "From another device",
  status: "sent",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
  sent_at: "2026-11-09T10:00:00Z",
  delivered_at: null,
  read_at: null,
  deleted_at: null,
};

const readHistoryMessage = {
  ...incomingMessage,
  id: "read-history-id",
  content: "Already read on another device",
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useMessages realtime integration", () => {
  it("merges overlapping REST recovery and WebSocket events and sends over the subscribed socket", async () => {
    const socket = new FakeSocket();
    const manager = new WebSocketConnectionManager({
      createSocket: () => socket,
      getUrl: () => "wss://relay.test/ws",
      acknowledgementTimeoutMs: 60_000,
    });
    manager.setAuthentication("access-token", async () => null);
    socket.open();
    socket.receive({ type: "auth.ok", user_id: "current-user" });

    const authenticatedFetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), window.location.origin);
        if (url.pathname.endsWith("/messages") && init?.method === "POST") {
          throw new Error("Connected message sends should use WebSocket.");
        }
        const limit = url.searchParams.get("limit");
        return jsonResponse({
          items: limit === "100"
            ? [incomingMessage, readHistoryMessage]
            : [],
          next_cursor: null,
        });
      },
    );

    function Wrapper({ children }: { children: ReactNode }) {
      const [state, setState] = useState<ConnectionState>(
        manager.connectionState,
      );
      useEffect(() => manager.listen(setState), []);
      return (
        <MessagingRealtimeContext.Provider value={{ manager, state }}>
          {children}
        </MessagingRealtimeContext.Provider>
      );
    }

    const { result, unmount } = renderHook(
      () =>
        useMessages(
          authenticatedFetch,
          "conversation-id",
          "current-user",
          true,
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(
        socket.parsedFrames().some((event) => event.type === "subscribe"),
      ).toBe(true),
    );
    act(() => {
      socket.receive({
        type: "subscribed",
        conversation_id: "conversation-id",
      });
      socket.receive({
        type: "message.status",
        conversation_id: "conversation-id",
        status: {
          id: "read-history-id",
          status: "read",
          sent_at: incomingMessage.sent_at,
          delivered_at: "2026-11-09T10:01:00Z",
          read_at: "2026-11-09T10:02:00Z",
        },
      });
      socket.receive({
        type: "message.status",
        conversation_id: "conversation-id",
        status: {
          id: "read-history-id",
          status: "delivered",
          sent_at: incomingMessage.sent_at,
          delivered_at: "2026-11-09T10:01:00Z",
          read_at: null,
        },
      });
      socket.receive({ type: "message.received", message: incomingMessage });
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[0].id).toBe("incoming-id");
    expect(
      result.current.messages.find((message) => message.id === "read-history-id")
        ?.status,
    ).toBe("read");
    expect(
      socket.parsedFrames().filter((event) => event.type === "message.delivery_ack_batch"),
    ).toHaveLength(1);

    act(() => {
      socket.receive({
        type: "message.status",
        conversation_id: "conversation-id",
        status: {
          id: "incoming-id",
          status: "delivered",
          sent_at: incomingMessage.sent_at,
          delivered_at: "2026-11-09T10:01:00Z",
          read_at: null,
        },
      });
    });
    await waitFor(() =>
      expect(result.current.messages[0].status).toBe("delivered"),
    );

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send("Realtime reply");
    });
    await waitFor(() =>
      expect(
        socket.parsedFrames().some((event) => event.type === "message.send"),
      ).toBe(true),
    );
    const sentEvent = socket
      .parsedFrames()
      .find((event) => event.type === "message.send");
    const outgoingMessage = {
      ...incomingMessage,
      id: "outgoing-id",
      sender_id: "current-user",
      content: "Realtime reply",
    };
    act(() => {
      socket.receive({
        type: "message.sent",
        client_message_id: sentEvent?.client_message_id,
        message: outgoingMessage,
      });
    });
    await act(async () => sendPromise);

    expect(authenticatedFetch).not.toHaveBeenCalledWith(
      "/conversations/conversation-id/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.messages.map((message) => message.id)).toEqual([
      "incoming-id",
      "outgoing-id",
      "read-history-id",
    ]);

    unmount();
    manager.setAuthentication(null, null);
  });
});
