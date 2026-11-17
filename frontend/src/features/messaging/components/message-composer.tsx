"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

type MessageComposerProps = {
  canSend: boolean;
  error: string;
  onSend: (content: string) => Promise<void>;
};

export function MessageComposer({
  canSend,
  error,
  onSend,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const combinedError = error || submitError;

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!content.trim() || isSending || !canSend) {
      return;
    }
    const submittedContent = content;
    setIsSending(true);
    setSubmitError("");
    try {
      await onSend(submittedContent);
      setContent("");
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "We could not confirm that your message was sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      className="messages-composer-form shrink-0 bg-surface px-3 py-3 sm:px-5"
      onSubmit={(event) => void submit(event)}
    >
      {combinedError ? (
        <p className="mb-2 text-sm leading-5 text-danger" role="alert">
          {combinedError}
        </p>
      ) : null}
      {!canSend && !combinedError ? (
        <p className="mb-2 text-sm leading-5 text-muted" role="status">
          Sending is unavailable for this conversation.
        </p>
      ) : null}
      <label className="sr-only" htmlFor="message-composer">
        Write a message
      </label>
      <div className="flex items-end gap-2 sm:gap-3">
        <textarea
          className="messages-composer-input max-h-36 min-h-10 min-w-0 flex-1 resize-y rounded-xl bg-surface-raised px-3.5 py-2.5 text-xs leading-5 text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canSend || isSending}
          id="message-composer"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canSend ? "Write a message…" : "Messaging unavailable"}
          value={content}
        />
        <Button
          aria-label={isSending ? "Sending message" : "Send message"}
          className="messages-send-button size-10 shrink-0 rounded-xl p-0"
          disabled={!canSend || isSending || !content.trim()}
          loading={isSending}
          type="submit"
        >
          {isSending ? (
            <span className="sr-only">Sending…</span>
          ) : (
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M21 3 9.9 13.1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          )}
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted">
        Press Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}
