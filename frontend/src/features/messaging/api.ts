import type { AuthenticatedRequest } from "@/features/users/types";
import type { MessagePage, MessageRecord, MessageStatus } from "@/features/messaging/types";

export class MessageRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MessageRequestError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageStatus(value: unknown): value is MessageStatus {
  return value === "sent" || value === "delivered" || value === "read";
}

export function parseMessageRecord(value: unknown): MessageRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.conversation_id !== "string" ||
    typeof value.sender_id !== "string" ||
    (typeof value.content !== "string" && value.content !== null) ||
    !isMessageStatus(value.status) ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string" ||
    typeof value.sent_at !== "string" ||
    (typeof value.delivered_at !== "string" && value.delivered_at !== null) ||
    (typeof value.read_at !== "string" && value.read_at !== null) ||
    (typeof value.deleted_at !== "string" && value.deleted_at !== null)
  ) {
    throw new MessageRequestError(
      502,
      "Relay returned an unexpected message response. Please try again.",
    );
  }
  return {
    id: value.id,
    conversation_id: value.conversation_id,
    sender_id: value.sender_id,
    content: value.content,
    status: value.status,
    created_at: value.created_at,
    updated_at: value.updated_at,
    sent_at: value.sent_at,
    delivered_at: value.delivered_at,
    read_at: value.read_at,
    deleted_at: value.deleted_at,
  };
}

function parseMessagePage(value: unknown): MessagePage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    (typeof value.next_cursor !== "string" && value.next_cursor !== null)
  ) {
    throw new MessageRequestError(
      502,
      "Relay returned an unexpected message history response. Please try again.",
    );
  }
  return {
    items: value.items.map(parseMessageRecord),
    next_cursor: value.next_cursor,
  };
}

async function request(
  authenticatedFetch: AuthenticatedRequest,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    response = await authenticatedFetch(path, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof MessageRequestError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new MessageRequestError(
      0,
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      isRecord(body) && typeof body.detail === "string" ? body.detail : "";
    if (response.status === 401) {
      throw new MessageRequestError(
        response.status,
        "Your session has expired. Please sign in again.",
      );
    }
    if (response.status === 404) {
      throw new MessageRequestError(
        response.status,
        "This message or conversation is no longer available.",
      );
    }
    if (response.status === 403) {
      throw new MessageRequestError(
        response.status,
        detail === "You may only modify messages you authored"
          ? "You may only edit or delete messages you sent."
          : detail === "An accepted, unblocked connection is required to send messages"
            ? "New messages are unavailable because this is no longer an accepted, unblocked connection."
            : "You do not have permission to perform this message action.",
      );
    }
    if (response.status === 409) {
      throw new MessageRequestError(
        response.status,
        "Deleted messages cannot be changed again.",
      );
    }
    if (response.status === 422) {
      throw new MessageRequestError(
        response.status,
        "Message content or pagination details are invalid.",
      );
    }
    if (
      response.status === 503 &&
      detail === "Database temporarily unavailable."
    ) {
      throw new MessageRequestError(
        response.status,
        "Relay's database is temporarily unavailable. Please try again shortly.",
      );
    }
    if (response.status >= 500) {
      throw new MessageRequestError(
        response.status,
        "Relay is temporarily unavailable. Please try again shortly.",
      );
    }
    throw new MessageRequestError(
      response.status,
      "We could not complete this message action. Please try again.",
    );
  }
  return body;
}

export async function listMessages(
  authenticatedFetch: AuthenticatedRequest,
  conversationId: string,
  { limit = 50, cursor }: { limit?: number; cursor?: string } = {},
  signal?: AbortSignal,
): Promise<MessagePage> {
  const search = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    search.set("cursor", cursor);
  }
  const body = await request(
    authenticatedFetch,
    `/conversations/${encodeURIComponent(conversationId)}/messages?${search}`,
    { signal },
  );
  return parseMessagePage(body);
}

export async function sendMessage(
  authenticatedFetch: AuthenticatedRequest,
  conversationId: string,
  content: string,
): Promise<MessageRecord> {
  const body = await request(
    authenticatedFetch,
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  return parseMessageRecord(body);
}

export async function editMessage(
  authenticatedFetch: AuthenticatedRequest,
  messageId: string,
  content: string,
): Promise<MessageRecord> {
  const body = await request(
    authenticatedFetch,
    `/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  return parseMessageRecord(body);
}

export async function deleteMessage(
  authenticatedFetch: AuthenticatedRequest,
  messageId: string,
): Promise<MessageRecord> {
  const body = await request(
    authenticatedFetch,
    `/messages/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
  return parseMessageRecord(body);
}
