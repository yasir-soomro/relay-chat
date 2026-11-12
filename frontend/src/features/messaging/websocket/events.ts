import type { MessageRecord, MessageStatus } from "@/features/messaging/types";
import { parseMessageRecord } from "@/features/messaging/api";

export type MessageStatusRecord = {
  id: string;
  status: MessageStatus;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

export type ClientEvent =
  | { type: "subscribe"; conversation_id: string }
  | { type: "unsubscribe"; conversation_id: string }
  | {
      type: "message.send";
      conversation_id: string;
      client_message_id: string;
      content: string;
    }
  | {
      type: "message.delivery_ack";
      conversation_id: string;
      message_id: string;
    }
  | {
      type: "message.delivery_ack_batch" | "message.read_ack";
      conversation_id: string;
      message_ids: string[];
    };

export type ServerEvent =
  | { type: "auth.ok"; user_id: string }
  | { type: "subscribed"; conversation_id: string }
  | { type: "unsubscribed"; conversation_id: string }
  | { type: "message.sent"; client_message_id: string; message: MessageRecord }
  | { type: "message.received"; message: MessageRecord }
  | {
      type: "message.status";
      conversation_id: string;
      status: MessageStatusRecord;
    }
  | { type: "error"; code: string; detail: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStatus(value: unknown): value is MessageStatus {
  return value === "sent" || value === "delivered" || value === "read";
}

function parseStatus(value: unknown): MessageStatusRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isStatus(value.status) ||
    typeof value.sent_at !== "string" ||
    (typeof value.delivered_at !== "string" && value.delivered_at !== null) ||
    (typeof value.read_at !== "string" && value.read_at !== null)
  ) {
    throw new TypeError("Relay returned an invalid WebSocket status event.");
  }
  return {
    id: value.id,
    status: value.status,
    sent_at: value.sent_at,
    delivered_at: value.delivered_at,
    read_at: value.read_at,
  };
}

export function parseServerEvent(value: unknown): ServerEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new TypeError("Relay returned an invalid WebSocket event.");
  }

  switch (value.type) {
    case "auth.ok":
    case "subscribed":
    case "unsubscribed":
      if (
        (value.type === "auth.ok" && typeof value.user_id !== "string") ||
        (value.type !== "auth.ok" &&
          typeof value.conversation_id !== "string")
      ) {
        throw new TypeError("Relay returned an invalid WebSocket event.");
      }
      return value.type === "auth.ok"
        ? { type: value.type, user_id: value.user_id as string }
        : {
            type: value.type,
            conversation_id: value.conversation_id as string,
          };
    case "message.sent":
      if (typeof value.client_message_id !== "string") {
        throw new TypeError("Relay returned an invalid WebSocket event.");
      }
      return {
        type: value.type,
        client_message_id: value.client_message_id,
        message: parseMessageRecord(value.message),
      };
    case "message.received":
      return {
        type: value.type,
        message: parseMessageRecord(value.message),
      };
    case "message.status":
      if (typeof value.conversation_id !== "string") {
        throw new TypeError("Relay returned an invalid WebSocket event.");
      }
      return {
        type: value.type,
        conversation_id: value.conversation_id,
        status: parseStatus(value.status),
      };
    case "error":
      if (
        typeof value.code !== "string" ||
        typeof value.detail !== "string"
      ) {
        throw new TypeError("Relay returned an invalid WebSocket event.");
      }
      return { type: value.type, code: value.code, detail: value.detail };
    default:
      throw new TypeError("Relay returned an unsupported WebSocket event.");
  }
}

export function messageFromServerEvent(event: ServerEvent): MessageRecord | null {
  if (event.type === "message.sent" || event.type === "message.received") {
    return event.message;
  }
  return null;
}
