import { describe, expect, it, vi } from "vitest";
import {
  deleteMessage,
  editMessage,
  listMessages,
  MessageRequestError,
  sendMessage,
} from "@/features/messaging/api";

const message = {
  id: "message-id",
  conversation_id: "conversation-id",
  sender_id: "sender-id",
  content: "Hello",
  status: "sent",
  created_at: "2026-11-08T00:00:00Z",
  updated_at: "2026-11-08T00:00:00Z",
  sent_at: "2026-11-08T00:00:00Z",
  delivered_at: null,
  read_at: null,
  deleted_at: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("message API", () => {
  it("retrieves newest-first cursor pages using the actual history contract", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ items: [message], next_cursor: "opaque-cursor" }),
      );
    await expect(
      listMessages(
        authenticatedFetch,
        "conversation/id",
        { limit: 50, cursor: "opaque-cursor" },
      ),
    ).resolves.toEqual({
      items: [message],
      next_cursor: "opaque-cursor",
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations/conversation%2Fid/messages?limit=50&cursor=opaque-cursor",
      expect.objectContaining({ cache: "no-store" }),
    );
    const [, init] = authenticatedFetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("sends the REST content contract without automatically adding retry keys", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(message, 201));
    await expect(
      sendMessage(authenticatedFetch, "conversation-id", "Hello"),
    ).resolves.toEqual(message);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/conversations/conversation-id/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Hello" }),
      }),
    );
    const [, init] = authenticatedFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("uses the owner-only edit and delete REST operations", async () => {
    const edited = { ...message, content: "Updated" };
    const deleted = {
      ...message,
      content: null,
      deleted_at: "2026-11-08T01:00:00Z",
    };
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(edited))
      .mockResolvedValueOnce(jsonResponse(deleted));

    await expect(
      editMessage(authenticatedFetch, "message-id", "Updated"),
    ).resolves.toEqual(edited);
    await expect(
      deleteMessage(authenticatedFetch, "message-id"),
    ).resolves.toEqual(deleted);
    expect(authenticatedFetch.mock.calls[0]).toEqual([
      "/messages/message-id",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ content: "Updated" }),
      }),
    ]);
    expect(authenticatedFetch.mock.calls[1]).toEqual([
      "/messages/message-id",
      expect.objectContaining({ method: "DELETE" }),
    ]);
  });

  it("surfaces the backend's blocking/connection send restriction", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          detail:
            "An accepted, unblocked connection is required to send messages",
        },
        403,
      ),
    );
    await expect(
      sendMessage(authenticatedFetch, "conversation-id", "Hello"),
    ).rejects.toMatchObject({
      name: "MessageRequestError",
      status: 403,
      message:
        "New messages are unavailable because this is no longer an accepted, unblocked connection.",
    } satisfies Partial<MessageRequestError>);
  });

  it("distinguishes expired sessions and database outages", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ detail: "Authentication required" }, 401),
      )
      .mockResolvedValueOnce(
        jsonResponse({ detail: "Database temporarily unavailable." }, 503),
      );

    await expect(
      listMessages(authenticatedFetch, "conversation-id"),
    ).rejects.toMatchObject({
      status: 401,
      message: "Your session has expired. Please sign in again.",
    } satisfies Partial<MessageRequestError>);
    await expect(
      listMessages(authenticatedFetch, "conversation-id"),
    ).rejects.toMatchObject({
      status: 503,
      message:
        "Relay's database is temporarily unavailable. Please try again shortly.",
    } satisfies Partial<MessageRequestError>);
  });

  it("rejects response fields that do not match the backend schema", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], has_more: false }));
    await expect(
      listMessages(authenticatedFetch, "conversation-id"),
    ).rejects.toMatchObject({ name: "MessageRequestError", status: 502 });
  });
});
