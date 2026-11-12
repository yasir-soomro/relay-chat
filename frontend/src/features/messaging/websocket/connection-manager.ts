import type { MessageRecord } from "@/features/messaging/types";
import {
  parseServerEvent,
  type ClientEvent,
  type ServerEvent,
} from "@/features/messaging/websocket/events";
import {
  createWebSocketTransport,
  getRelayWebSocketUrl,
  serializeClientEvent,
  type WebSocketTransport,
} from "@/features/messaging/websocket/websocket-client";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

type ConversationListener = {
  onEvent: (event: ServerEvent) => void;
  onSubscribed?: (isReconnect: boolean) => void;
};

type PendingSend = {
  conversationId: string;
  event: Extract<ClientEvent, { type: "message.send" }>;
  attempts: number;
  resolve: (message: MessageRecord) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

type ManagerOptions = {
  createSocket?: (url: string) => WebSocketTransport;
  getUrl?: () => string;
  authTimeoutMs?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  maxRetries?: number;
  acknowledgementTimeoutMs?: number;
};

const openState = 1;
const authFailureCodes = new Set([
  "authentication_timeout",
  "unauthorized",
  "invalid_auth_event",
]);

function createClientMessageId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("This browser cannot securely create message identifiers.");
  }
  return globalThis.crypto.randomUUID();
}

export class WebSocketConnectionManager {
  private readonly socketFactory: (url: string) => WebSocketTransport;
  private readonly getUrl: () => string;
  private readonly authTimeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly maxRetries: number;
  private readonly acknowledgementTimeoutMs: number;
  private readonly stateListeners = new Set<(state: ConnectionState) => void>();
  private readonly conversations = new Map<
    string,
    Map<symbol, ConversationListener>
  >();
  private readonly subscribedConversations = new Set<string>();
  private readonly pendingSends = new Map<string, PendingSend>();

  private accessToken: string | null = null;
  private identityId: string | null = null;
  private refreshAuthentication: (() => Promise<string | null>) | null = null;
  private socket: WebSocketTransport | null = null;
  private state: ConnectionState = "offline";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private authenticated = false;
  private hasAuthenticated = false;
  private restoringSubscriptions = false;
  private authSuspended = false;
  private intentionallyClosed = false;

  constructor(options: ManagerOptions = {}) {
    this.socketFactory = options.createSocket ?? createWebSocketTransport;
    this.getUrl = options.getUrl ?? getRelayWebSocketUrl;
    this.authTimeoutMs = options.authTimeoutMs ?? 10_000;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 8;
    this.acknowledgementTimeoutMs =
      options.acknowledgementTimeoutMs ?? 15_000;
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  listen(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  setAuthentication(
    accessToken: string | null,
    refreshAuthentication: (() => Promise<string | null>) | null,
    identityId: string | null = null,
  ): void {
    this.refreshAuthentication = refreshAuthentication;
    if (this.identityId !== null && this.identityId !== identityId) {
      this.stop();
      this.conversations.clear();
      this.subscribedConversations.clear();
      this.rejectPendingSends(new Error("Your session has changed."));
      this.hasAuthenticated = false;
      this.retryCount = 0;
      this.accessToken = null;
      this.setState("offline");
    }
    this.identityId = identityId;
    if (this.accessToken === accessToken) {
      if (accessToken && !this.socket && !this.reconnectTimer) {
        this.connect();
      }
      return;
    }

    const previousToken = this.accessToken;
    this.accessToken = accessToken;
    if (accessToken) {
      this.retryCount = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (previousToken && this.socket) {
        this.setState("reconnecting");
        this.socket.close(4001, "Access token refreshed");
      } else {
        this.connect();
      }
      return;
    }

    this.stop();
    this.conversations.clear();
    this.subscribedConversations.clear();
    this.rejectPendingSends(new Error("Your session has ended."));
    this.setState("offline");
  }

  subscribe(
    conversationId: string,
    listener: ConversationListener,
  ): () => void {
    const subscriptionId = Symbol(conversationId);
    const firstSubscription = !this.conversations.has(conversationId);
    const listeners = this.conversations.get(conversationId) ?? new Map();
    listeners.set(subscriptionId, listener);
    this.conversations.set(conversationId, listeners);

    if (firstSubscription && this.authenticated) {
      this.sendSubscribe(conversationId);
    }

    return () => {
      const current = this.conversations.get(conversationId);
      current?.delete(subscriptionId);
      if (current?.size) {
        return;
      }
      this.conversations.delete(conversationId);
      this.subscribedConversations.delete(conversationId);
      if (this.authenticated && this.socket?.readyState === openState) {
        try {
          this.sendFrame({
            type: "unsubscribe",
            conversation_id: conversationId,
          });
        } catch {
          this.socket?.close(1011, "Unsubscribe could not be sent");
        }
      }
    };
  }

  isConversationReady(conversationId: string): boolean {
    return (
      this.authenticated &&
      this.socket?.readyState === openState &&
      this.subscribedConversations.has(conversationId)
    );
  }

  sendMessage(
    conversationId: string,
    content: string,
  ): Promise<MessageRecord> {
    if (!this.isConversationReady(conversationId)) {
      return Promise.reject(
        new Error("The conversation is not connected. Try again shortly."),
      );
    }

    const clientMessageId = createClientMessageId();
    const event: Extract<ClientEvent, { type: "message.send" }> = {
      type: "message.send",
      conversation_id: conversationId,
      client_message_id: clientMessageId,
      content,
    };

    return new Promise((resolve, reject) => {
      const pending: PendingSend = {
        conversationId,
        event,
        attempts: 0,
        resolve,
        reject,
        timer: null,
      };
      this.pendingSends.set(clientMessageId, pending);
      this.transmitPending(pending);
    });
  }

  sendEvent(event: ClientEvent): void {
    if (!this.authenticated || !this.socket || this.socket.readyState !== openState) {
      throw new Error("The WebSocket connection is not ready.");
    }
    this.sendFrame(event);
  }

  retry(): void {
    if (!this.accessToken) {
      return;
    }
    this.retryCount = 0;
    this.connect();
  }

  private connect(): void {
    if (
      !this.accessToken ||
      this.socket ||
      this.reconnectTimer ||
      this.authSuspended
    ) {
      return;
    }
    this.intentionallyClosed = false;
    this.authenticated = false;
    this.subscribedConversations.clear();
    this.setState(this.hasAuthenticated ? "reconnecting" : "connecting");

    let socket: WebSocketTransport;
    try {
      socket = this.socketFactory(this.getUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (socket !== this.socket || !this.accessToken) {
        return;
      }
      this.authTimer = setTimeout(() => {
        if (!this.authenticated && socket === this.socket) {
          socket.close(4401, "Authentication timeout");
        }
      }, this.authTimeoutMs);
      try {
        this.sendFrame({
          type: "auth",
          access_token: this.accessToken,
        });
      } catch {
        socket.close(1011, "Authentication could not be sent");
      }
    };

    socket.onmessage = (event) => {
      if (socket !== this.socket) {
        return;
      }
      this.receive(event.data, socket);
    };

    socket.onerror = () => {
      if (socket === this.socket && !this.intentionallyClosed) {
        socket.close();
      }
    };

    socket.onclose = () => {
      if (socket !== this.socket) {
        return;
      }
      this.clearAuthTimer();
      this.socket = null;
      this.authenticated = false;
      this.subscribedConversations.clear();
      this.clearPendingTimers();
      if (this.intentionallyClosed || !this.accessToken) {
        return;
      }
      if (this.authSuspended) {
        return;
      }
      this.scheduleReconnect();
    };
  }

  private receive(raw: unknown, socket: WebSocketTransport): void {
    let event: ServerEvent;
    try {
      const value = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
      event = parseServerEvent(value);
    } catch {
      socket.close(1002, "Invalid WebSocket event");
      return;
    }

    if (!this.authenticated) {
      if (event.type === "auth.ok") {
        this.clearAuthTimer();
        const isReconnect = this.hasAuthenticated;
        this.restoringSubscriptions = isReconnect;
        this.authenticated = true;
        this.hasAuthenticated = true;
        this.retryCount = 0;
        this.setState("connected");
        for (const conversationId of this.conversations.keys()) {
          this.sendSubscribe(conversationId);
        }
        return;
      }
      if (event.type === "error") {
        if (authFailureCodes.has(event.code)) {
          void this.refreshAfterAuthenticationFailure();
        } else {
          socket.close(4400, "WebSocket authentication failed");
        }
      } else {
        socket.close(4400, "Authentication must complete before events");
      }
      return;
    }

    if (event.type === "auth.ok") {
      socket.close(4400, "Unexpected authentication event");
      return;
    }

    if (event.type === "subscribed") {
      const listeners = this.conversations.get(event.conversation_id);
      if (!listeners) {
        return;
      }
      this.subscribedConversations.add(event.conversation_id);
      for (const listener of listeners.values()) {
        listener.onSubscribed?.(this.restoringSubscriptions);
      }
      if (this.subscribedConversations.size === this.conversations.size) {
        this.restoringSubscriptions = false;
      }
      for (const pending of this.pendingSends.values()) {
        if (pending.conversationId === event.conversation_id) {
          this.transmitPending(pending);
        }
      }
      return;
    }

    if (event.type === "unsubscribed") {
      this.subscribedConversations.delete(event.conversation_id);
      return;
    }

    if (event.type === "message.sent") {
      const pending = this.pendingSends.get(event.client_message_id);
      if (pending) {
        this.clearPendingTimer(pending);
        this.pendingSends.delete(event.client_message_id);
        pending.resolve(event.message);
      }
      this.notifyConversation(event.message.conversation_id, event);
      return;
    }

    if (event.type === "message.received") {
      this.notifyConversation(event.message.conversation_id, event);
      return;
    }

    if (event.type === "message.status") {
      this.notifyConversation(event.conversation_id, event);
      return;
    }

    if (event.type === "error") {
      this.notifyAll(event);
    }
  }

  private sendSubscribe(conversationId: string): void {
    try {
      this.sendFrame({ type: "subscribe", conversation_id: conversationId });
    } catch {
      this.socket?.close(1011, "Subscription could not be sent");
    }
  }

  private sendFrame(event: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== openState) {
      throw new Error("The WebSocket connection is not open.");
    }
    this.socket.send(serializeClientEvent(event));
  }

  private notifyConversation(conversationId: string, event: ServerEvent): void {
    for (const listener of this.conversations.get(conversationId)?.values() ?? []) {
      listener.onEvent(event);
    }
  }

  private notifyAll(event: ServerEvent): void {
    for (const listeners of this.conversations.values()) {
      for (const listener of listeners.values()) {
        listener.onEvent(event);
      }
    }
  }

  private transmitPending(pending: PendingSend): void {
    if (!this.isConversationReady(pending.conversationId)) {
      return;
    }
    if (pending.attempts >= this.maxRetries + 1) {
      this.pendingSends.delete(pending.event.client_message_id);
      pending.reject(new Error("Relay could not confirm that your message was sent."));
      return;
    }
    pending.attempts += 1;
    try {
      this.sendFrame(pending.event);
      pending.timer = setTimeout(() => {
        if (this.pendingSends.has(pending.event.client_message_id)) {
          this.socket?.close(4000, "Message acknowledgement timeout");
        }
      }, this.acknowledgementTimeoutMs);
    } catch (error) {
      pending.reject(
        error instanceof Error ? error : new Error("The message could not be sent."),
      );
      this.pendingSends.delete(pending.event.client_message_id);
    }
  }

  private scheduleReconnect(): void {
    if (!this.accessToken || this.reconnectTimer) {
      return;
    }
    if (this.retryCount >= this.maxRetries) {
      this.setState("offline");
      this.rejectPendingSends(
        new Error("Relay is offline. Reconnect before sending another message."),
      );
      return;
    }
    const delay = Math.min(
      this.retryDelayMs * 2 ** this.retryCount,
      this.maxRetryDelayMs,
    );
    this.retryCount += 1;
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private async refreshAfterAuthenticationFailure(): Promise<void> {
    if (!this.refreshAuthentication || this.authSuspended) {
      this.socket?.close(4401, "Authentication failed");
      return;
    }
    this.authSuspended = true;
    this.socket?.close(4401, "Refreshing authentication");
    try {
      const token = await this.refreshAuthentication();
      this.accessToken = token;
    } catch {
      this.authSuspended = false;
      this.scheduleReconnect();
      return;
    }
    this.authSuspended = false;
    if (this.accessToken) {
      this.retryCount = 0;
      this.connect();
    } else {
      this.setState("offline");
    }
  }

  private clearAuthTimer(): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
  }

  private clearPendingTimer(pending: PendingSend): void {
    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }
  }

  private clearPendingTimers(): void {
    for (const pending of this.pendingSends.values()) {
      this.clearPendingTimer(pending);
    }
  }

  private rejectPendingSends(error: Error): void {
    for (const pending of this.pendingSends.values()) {
      this.clearPendingTimer(pending);
      pending.reject(error);
    }
    this.pendingSends.clear();
  }

  private stop(): void {
    this.intentionallyClosed = true;
    this.clearAuthTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    this.authenticated = false;
    this.subscribedConversations.clear();
    socket?.close(1000, "Session ended");
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }
}
