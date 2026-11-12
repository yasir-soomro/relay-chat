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
      className="shrink-0 border-t border-line bg-surface px-3 py-3 sm:px-6 sm:py-4"
      onSubmit={(event) => void submit(event)}
    >
      {combinedError ? (
        <p className="mb-2 text-sm leading-5 text-[#8e3027]" role="alert">
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
          className="max-h-48 min-h-12 min-w-0 flex-1 resize-y rounded-2xl border border-line bg-canvas px-4 py-3 text-sm leading-6 text-ink placeholder:text-muted focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canSend || isSending}
          id="message-composer"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canSend ? "Write a message…" : "Messaging unavailable"}
          value={content}
        />
        <Button
          className="shrink-0 px-4 sm:px-5"
          disabled={!canSend || isSending || !content.trim()}
          type="submit"
        >
          {isSending ? "Sending…" : "Send"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Press Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}
