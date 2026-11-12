import { describe, expect, it } from "vitest";
import { parseServerEvent } from "@/features/messaging/websocket/events";

const message = {
  id: "message-id",
  conversation_id: "conversation-id",
  sender_id: "sender-id",
  content: "Hello",
  status: "sent",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
  sent_at: "2026-11-09T10:00:00Z",
  delivered_at: null,
  read_at: null,
  deleted_at: null,
};

describe("WebSocket server event parsing", () => {
  it("parses backend message and global status contracts", () => {
    expect(
      parseServerEvent({
        type: "message.received",
        message,
      }),
    ).toEqual({ type: "message.received", message });
    expect(
      parseServerEvent({
        type: "message.status",
        conversation_id: "conversation-id",
        status: {
          id: "message-id",
          status: "read",
          sent_at: message.sent_at,
          delivered_at: message.sent_at,
          read_at: message.sent_at,
        },
      }),
    ).toMatchObject({
      type: "message.status",
      status: { id: "message-id", status: "read" },
    });
  });

  it("rejects unexpected event names and malformed event payloads", () => {
    expect(() => parseServerEvent({ type: "message.created" })).toThrow(
      "unsupported WebSocket event",
    );
    expect(() =>
      parseServerEvent({
        type: "message.status",
        conversation_id: "conversation-id",
        status: { id: "message-id", status: "seen" },
      }),
    ).toThrow("invalid WebSocket status event");
    expect(() =>
      parseServerEvent({
        type: "message.received",
        message: { ...message, sender_id: undefined },
      }),
    ).toThrow("unexpected message response");
  });
});
