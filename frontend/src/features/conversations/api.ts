import type { AuthenticatedRequest } from "@/features/users/types";
import type {
  Conversation,
  ConversationList,
  ConversationListItem,
} from "@/features/conversations/types";

export class ConversationRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ConversationRequestError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseConversation(value: unknown): Conversation {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.user_low_id !== "string" ||
    typeof value.user_high_id !== "string" ||
    typeof value.created_at !== "string"
  ) {
    throw new ConversationRequestError(
      502,
      "Relay returned an unexpected conversation response. Please try again.",
    );
  }
  return {
    id: value.id,
    user_low_id: value.user_low_id,
    user_high_id: value.user_high_id,
    created_at: value.created_at,
  };
}

function parseConversationList(value: unknown): ConversationList {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ConversationRequestError(
      502,
      "Relay returned an unexpected conversation list. Please try again.",
    );
  }
  return {
    items: value.items.map((item): ConversationListItem => {
      if (
        !isRecord(item) ||
        typeof item.unread_count !== "number" ||
        !Number.isInteger(item.unread_count) ||
        item.unread_count < 0
      ) {
        throw new ConversationRequestError(
          502,
          "Relay returned an unexpected conversation list. Please try again.",
        );
      }
      return {
        ...parseConversation(item),
        unread_count: item.unread_count,
      };
    }),
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
    if (error instanceof ConversationRequestError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new ConversationRequestError(
      0,
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      isRecord(body) && typeof body.detail === "string" ? body.detail : "";
    if (response.status === 404) {
      throw new ConversationRequestError(
        response.status,
        "This conversation or member is no longer available.",
      );
    }
    if (response.status === 403) {
      throw new ConversationRequestError(
        response.status,
        detail === "An accepted connection is required"
          ? "An accepted connection is required to start a conversation."
          : "You do not have access to this conversation.",
      );
    }
    if (response.status === 400) {
      throw new ConversationRequestError(
        response.status,
        "You cannot start a conversation with yourself.",
      );
    }
    if (response.status >= 500) {
      throw new ConversationRequestError(
        response.status,
        "Relay is temporarily unavailable. Please try again shortly.",
      );
    }
    throw new ConversationRequestError(
      response.status,
      "We could not complete this conversation request. Please try again.",
    );
  }
  return body;
}

export async function listConversations(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<ConversationList> {
  return parseConversationList(
    await request(authenticatedFetch, "/conversations", { signal }),
  );
}

export async function getConversation(
  authenticatedFetch: AuthenticatedRequest,
  conversationId: string,
  signal?: AbortSignal,
): Promise<Conversation> {
  return parseConversation(
    await request(
      authenticatedFetch,
      `/conversations/${encodeURIComponent(conversationId)}`,
      { signal },
    ),
  );
}

export async function createOrGetConversation(
  authenticatedFetch: AuthenticatedRequest,
  recipientId: string,
): Promise<Conversation> {
  return parseConversation(
    await request(authenticatedFetch, "/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: recipientId }),
    }),
  );
}
