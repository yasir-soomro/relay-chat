import { afterEach, describe, expect, it, vi } from "vitest";
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
  closeCode: number | undefined;

  constructor(readonly url: string) {}

  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  receive(event: unknown) {
    this.onmessage?.({
      data: JSON.stringify(event),
    } as MessageEvent);
  }

  send(data: string) {
    this.frames.push(data);
  }

  close(code = 1000) {
    this.closeCode = code;
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  }

  parsedFrames() {
    return this.frames.map((frame) => JSON.parse(frame) as Record<string, unknown>);
  }
}

const persistedMessage = {
  id: "persisted-message",
  conversation_id: "conversation-id",
  sender_id: "user-id",
  content: "Hello",
  status: "sent",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
  sent_at: "2026-11-09T10:00:00Z",
  delivered_at: null,
  read_at: null,
  deleted_at: null,
};

function createManager() {
  const sockets: FakeSocket[] = [];
  const states: ConnectionState[] = [];
  const manager = new WebSocketConnectionManager({
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    getUrl: () => "wss://relay.test/ws",
    authTimeoutMs: 100,
    retryDelayMs: 10,
    maxRetryDelayMs: 40,
    maxRetries: 3,
    acknowledgementTimeoutMs: 60_000,
  });
  manager.listen((state) => states.push(state));
  return { manager, sockets, states };
}

function authenticate(socket: FakeSocket) {
  socket.open();
  socket.receive({ type: "auth.ok", user_id: "verified-user-id" });
}

describe("WebSocketConnectionManager", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("authenticates in the first frame and subscribes only after auth.ok", async () => {
    const { manager, sockets } = createManager();
    const received: string[] = [];
    manager.subscribe("conversation-id", {
      onEvent: (event) => received.push(event.type),
    });
    manager.setAuthentication("private-access-token", async () => null);

    const socket = sockets[0];
    expect(socket.url).toBe("wss://relay.test/ws");
    authenticate(socket);
    expect(socket.parsedFrames()).toEqual([
      { type: "auth", access_token: "private-access-token" },
      { type: "subscribe", conversation_id: "conversation-id" },
    ]);

    socket.receive({ type: "subscribed", conversation_id: "conversation-id" });
    expect(manager.isConversationReady("conversation-id")).toBe(true);

    const promise = manager.sendMessage("conversation-id", "Hello");
    const sendFrame = socket.parsedFrames().at(-1);
    expect(sendFrame).toMatchObject({
      type: "message.send",
      conversation_id: "conversation-id",
      content: "Hello",
    });
    expect(typeof sendFrame?.client_message_id).toBe("string");

    socket.receive({
      type: "message.sent",
      client_message_id: sendFrame?.client_message_id,
      message: persistedMessage,
    });
    await expect(promise).resolves.toEqual(persistedMessage);
    expect(received).toEqual(["message.sent"]);

    manager.setAuthentication(null, null);
  });

  it("re-authenticates, restores subscriptions, and retries with the same client ID", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("crypto", { randomUUID: () => "stable-client-message-id" });
    const { manager, sockets } = createManager();
    const reconnects: boolean[] = [];
    manager.subscribe("conversation-id", {
      onEvent: () => undefined,
      onSubscribed: (isReconnect) => reconnects.push(isReconnect),
    });
    manager.setAuthentication("private-access-token", async () => null);

    const first = sockets[0];
    authenticate(first);
    first.receive({ type: "subscribed", conversation_id: "conversation-id" });
    const pending = manager.sendMessage("conversation-id", "Retry me");
    const originalSend = first.parsedFrames().at(-1);
    expect(originalSend?.client_message_id).toBe("stable-client-message-id");

    first.close(1006);
    await vi.advanceTimersByTimeAsync(10);
    const second = sockets[1];
    expect(second.parsedFrames()).toEqual([]);
    authenticate(second);
    expect(second.parsedFrames()).toEqual([
      { type: "auth", access_token: "private-access-token" },
      { type: "subscribe", conversation_id: "conversation-id" },
    ]);
    second.receive({ type: "subscribed", conversation_id: "conversation-id" });
    expect(second.parsedFrames().at(-1)).toEqual(originalSend);
    expect(reconnects).toEqual([false, true]);

    second.receive({
      type: "message.sent",
      client_message_id: "stable-client-message-id",
      message: persistedMessage,
    });
    await expect(pending).resolves.toEqual(persistedMessage);
    manager.setAuthentication(null, null);
  });

  it("enforces the first-frame authentication deadline", async () => {
    vi.useFakeTimers();
    const { manager, sockets, states } = createManager();
    manager.setAuthentication("private-access-token", async () => null);
    sockets[0].open();

    await vi.advanceTimersByTimeAsync(100);

    expect(sockets[0].closeCode).toBe(4401);
    expect(states).toContain("reconnecting");
    manager.setAuthentication(null, null);
  });

  it("uses a refreshed access token for a newly authenticated connection", async () => {
    vi.useFakeTimers();
    const { manager, sockets } = createManager();
    manager.setAuthentication("first-token", async () => null);
    authenticate(sockets[0]);

    manager.setAuthentication("refreshed-token", async () => null);
    expect(sockets[0].closeCode).toBe(4001);

    await vi.advanceTimersByTimeAsync(10);
    authenticate(sockets[1]);
    expect(sockets[1].parsedFrames()[0]).toEqual({
      type: "auth",
      access_token: "refreshed-token",
    });
    manager.setAuthentication(null, null);
  });

  it("shares one socket across conversation subscriptions and unsubscribes on last use", () => {
    const { manager, sockets } = createManager();
    const first = manager.subscribe("conversation-one", {
      onEvent: () => undefined,
    });
    const duplicate = manager.subscribe("conversation-one", {
      onEvent: () => undefined,
    });
    manager.subscribe("conversation-two", { onEvent: () => undefined });
    manager.setAuthentication("access-token", async () => null);
    authenticate(sockets[0]);

    expect(sockets).toHaveLength(1);
    expect(
      sockets[0]
        .parsedFrames()
        .filter((event) => event.type === "subscribe"),
    ).toEqual([
      { type: "subscribe", conversation_id: "conversation-one" },
      { type: "subscribe", conversation_id: "conversation-two" },
    ]);

    first();
    expect(
      sockets[0].parsedFrames().filter((event) => event.type === "unsubscribe"),
    ).toHaveLength(0);
    duplicate();
    expect(
      sockets[0].parsedFrames().filter((event) => event.type === "unsubscribe"),
    ).toEqual([{ type: "unsubscribe", conversation_id: "conversation-one" }]);
    manager.setAuthentication(null, null);
  });

  it("uses exponential backoff and stops reconnecting after the configured limit", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const manager = new WebSocketConnectionManager({
      createSocket: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      getUrl: () => "wss://relay.test/ws",
      retryDelayMs: 10,
      maxRetryDelayMs: 40,
      maxRetries: 2,
    });
    manager.setAuthentication("access-token", async () => null);

    sockets[0].close(1006);
    await vi.advanceTimersByTimeAsync(10);
    expect(sockets).toHaveLength(2);
    sockets[1].close(1006);
    await vi.advanceTimersByTimeAsync(19);
    expect(sockets).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(3);

    sockets[2].close(1006);
    expect(manager.connectionState).toBe("offline");
    manager.setAuthentication(null, null);
  });

  it("stops reconnecting when an expired or revoked session cannot refresh", async () => {
    const { manager, sockets } = createManager();
    const refresh = vi.fn().mockResolvedValue(null);
    manager.setAuthentication("expired-token", refresh, "verified-user");
    sockets[0].open();
    sockets[0].receive({
      type: "error",
      code: "unauthorized",
      detail: "Invalid or expired authentication token",
    });

    await vi.waitFor(() =>
      expect(manager.connectionState).toBe("offline"),
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(sockets).toHaveLength(1);
  });
});
