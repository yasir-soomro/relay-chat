"use client";

import { useRef } from "react";
import { MessageActions } from "@/features/messaging/components/message-actions";
import type { MessageRecord } from "@/features/messaging/types";

type MessageBubbleProps = {
  message: MessageRecord;
  isOwn: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
};

export function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const longPressTimer = useRef<number | null>(null);
  const isDeleted = message.deleted_at !== null;
  const wasEdited =
    !isDeleted &&
    Date.parse(message.updated_at) > Date.parse(message.created_at);
  const timestamp = new Date(message.sent_at);
  const formattedTime = Number.isNaN(timestamp.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(timestamp);

  return (
    <li
      className={`messages-bubble-row flex min-w-0 ${isOwn ? "justify-end" : "justify-start"}`}
      data-message-id={message.id}
    >
      <article
        aria-label={isOwn ? "Your message" : "Message from participant"}
        className={`messages-bubble min-w-0 max-w-[90%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${
          isOwn
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-surface-raised text-ink"
        }`}
        onTouchStart={() => {
          if (isOwn && !isDeleted) {
            longPressTimer.current = window.setTimeout(() => {
              document
                .querySelector<HTMLElement>(`[data-message-id="${message.id}"] button[aria-label="Message options"]`)
                ?.click();
            }, 500);
          }
        }}
        onTouchEnd={() => {
          if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
        }}
        onTouchMove={() => {
          if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
        }}
      >
        {isDeleted ? (
          <p className="whitespace-pre-wrap break-words text-sm italic opacity-75">
            Message deleted
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.content}
          </p>
        )}
        <div
          className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${
            isOwn ? "text-primary-foreground/75" : "text-muted"
          }`}
        >
          <time dateTime={message.sent_at}>{formattedTime}</time>
          {wasEdited ? <span>Edited</span> : null}
          {!isDeleted ? (
            <span aria-label={`Message status: ${message.status}`}>
              · {message.status === "sent"
                ? "Sent"
                : message.status === "delivered"
                  ? "Delivered"
                  : "Read"}
            </span>
          ) : null}
        </div>
        {isOwn && !isDeleted ? (
          <MessageActions
            message={message}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : null}
      </article>
    </li>
  );
}
