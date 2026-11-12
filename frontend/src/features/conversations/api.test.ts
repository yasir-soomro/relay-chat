import { describe, expect, it, vi } from "vitest";
import {
  createOrGetConversation,
  ConversationRequestError,
  getConversation,
  listConversations,
} from "@/features/conversations/api";

const currentUserId = "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15";
const otherUserId = "76c2b9b5-d999-4806-a07e-bb3d4d738c2b";
const conversation = {
  id: "c805d073-d05a-4f4b-8eec-a589c4352c62",
  user_low_id: currentUserId,
  user_high_id: otherUserId,
  created_at: "2026-11-08T00:00:00Z",
};
const conversationListItem = { ...conversation, unread_count: 2 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("conversation API", () => {
  it("lists conversations using the authenticated API", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [conversationListItem] }));

    await expect(listConversations(authenticatedFetch)).resolves.toEqual({
      items: [conversationListItem],
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations",
      expect.objectContaining({ cache: "no-store" }),
    );
    const [, init] = authenticatedFetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("retrieves a conversation by its encoded id", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(conversation));
    await expect(
      getConversation(authenticatedFetch, "conversation/id"),
    ).resolves.toEqual(conversation);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations/conversation%2Fid",
      expect.objectContaining({ cache: "no-store" }),
    );
    const [, init] = authenticatedFetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("rejects malformed detail payloads and preserves the response status", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: conversation.id }));

    await expect(
      getConversation(authenticatedFetch, conversation.id),
    ).rejects.toMatchObject({
      name: "ConversationRequestError",
      status: 502,
      message:
        "Relay returned an unexpected conversation response. Please try again.",
    });
  });

  it("keeps not-found and unauthorized detail responses distinct from malformed data", async () => {
    const notFoundFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "Conversation or user not found" }, 404));
    const unauthorizedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401));

    await expect(
      getConversation(notFoundFetch, conversation.id),
    ).rejects.toMatchObject({
      status: 404,
      message: "This conversation or member is no longer available.",
    });
    await expect(
      getConversation(unauthorizedFetch, conversation.id),
    ).rejects.toMatchObject({
      status: 401,
      message: "We could not complete this conversation request. Please try again.",
    });
  });

  it("creates or retrieves a conversation using the backend recipient contract", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(conversation, 201));
    await expect(
      createOrGetConversation(authenticatedFetch, otherUserId),
    ).resolves.toEqual(conversation);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ recipient_id: otherUserId }),
      }),
    );
    const [, init] = authenticatedFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("reports backend connection and membership authorization errors", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ detail: "An accepted connection is required" }, 403),
      );
    await expect(
      createOrGetConversation(authenticatedFetch, otherUserId),
    ).rejects.toMatchObject({
      name: "ConversationRequestError",
      status: 403,
      message: "An accepted connection is required to start a conversation.",
    } satisfies Partial<ConversationRequestError>);
  });

  it("rejects unexpected response shapes instead of using guessed fields", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ items: [{ ...conversation, unread_count: -1 }] }),
      );
    await expect(listConversations(authenticatedFetch)).rejects.toMatchObject({
      name: "ConversationRequestError",
      status: 502,
    });
  });

  it("rejects list items missing the backend unread count field", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [conversation] }));

    await expect(listConversations(authenticatedFetch)).rejects.toMatchObject({
      name: "ConversationRequestError",
      status: 502,
      message:
        "Relay returned an unexpected conversation list. Please try again.",
    });
  });
});
