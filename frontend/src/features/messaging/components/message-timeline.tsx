"use client";

import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/features/messaging/components/message-bubble";
import type { MessageRecord } from "@/features/messaging/types";

type MessageTimelineProps = {
  messages: MessageRecord[];
  currentUserId: string;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  olderError: string;
  onLoadOlder: () => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
};

export function MessageTimeline({
  messages,
  currentUserId,
  hasOlder,
  isLoadingOlder,
  olderError,
  onLoadOlder,
  onEdit,
  onDelete,
}: MessageTimelineProps) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const firstMessageId = messages[0]?.id ?? "";
  const previousFirstMessageId = useRef("");
  const pendingScrollHeight = useRef<number | null>(null);
  const isNearBottom = useRef(true);

  useLayoutEffect(() => {
    const element = scrollContainer.current;
    if (!element || messages.length === 0) {
      return;
    }

    if (!previousFirstMessageId.current) {
      element.scrollTop = element.scrollHeight;
    } else if (
      pendingScrollHeight.current !== null &&
      firstMessageId !== previousFirstMessageId.current
    ) {
      element.scrollTop += element.scrollHeight - pendingScrollHeight.current;
      pendingScrollHeight.current = null;
    } else if (isNearBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
    previousFirstMessageId.current = firstMessageId;

    if (!isLoadingOlder && pendingScrollHeight.current !== null) {
      pendingScrollHeight.current = null;
    }
  }, [firstMessageId, isLoadingOlder, messages.length]);

  async function loadOlder() {
    if (scrollContainer.current) {
      pendingScrollHeight.current = scrollContainer.current.scrollHeight;
    }
    await onLoadOlder();
  }

  return (
    <div
      aria-label="Message history"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
      onScroll={(event) => {
        const element = event.currentTarget;
        isNearBottom.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 120;
      }}
      ref={scrollContainer}
      role="region"
      tabIndex={0}
    >
      {hasOlder || olderError ? (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          {olderError ? (
            <p className="text-sm text-[#8e3027]" role="alert">
              {olderError}
            </p>
          ) : null}
          {hasOlder ? (
            <Button
              disabled={isLoadingOlder}
              onClick={() => void loadOlder()}
              type="button"
              variant="secondary"
            >
              {isLoadingOlder
                ? "Loading older messages…"
                : olderError
                  ? "Try loading older messages"
                  : "Load older messages"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className="grid flex-1 place-content-center px-4 py-8 text-center">
          <h2 className="font-semibold text-ink">A fresh start</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Send a message to begin this conversation.
          </p>
        </div>
      ) : (
        <ol
          aria-label="Messages, oldest first"
          className="mt-auto flex min-w-0 flex-col gap-3"
        >
          {messages.map((message) => (
            <MessageBubble
              isOwn={message.sender_id === currentUserId}
              key={message.id}
              message={message}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
