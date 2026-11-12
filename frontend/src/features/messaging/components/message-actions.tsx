"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { MessageRecord } from "@/features/messaging/types";

type MessageActionsProps = {
  message: MessageRecord;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
};

export function MessageActions({
  message,
  onEdit,
  onDelete,
}: MessageActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || isSaving) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onEdit(message.id, content);
      setIsEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not edit this message. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteOwnMessage() {
    setIsSaving(true);
    setError("");
    try {
      await onDelete(message.id);
      setConfirmDelete(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not delete this message. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2">
      {isEditing ? (
        <form className="flex flex-col gap-2" onSubmit={saveEdit}>
          <label className="sr-only" htmlFor={`edit-${message.id}`}>
            Edit message
          </label>
          <textarea
            autoFocus
            className="min-h-20 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink focus:border-moss focus:outline-none"
            id={`edit-${message.id}`}
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-white text-ink hover:bg-soft"
              disabled={isSaving || !content.trim()}
              type="submit"
              variant="secondary"
            >
              {isSaving ? "Saving…" : "Save edit"}
            </Button>
            <Button
              onClick={() => {
                setContent(message.content ?? "");
                setError("");
                setIsEditing(false);
              }}
              className="border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
              type="button"
              variant="quiet"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted">Delete this message?</span>
          <Button
            disabled={isSaving}
            onClick={() => void deleteOwnMessage()}
            className="border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
            type="button"
            variant="quiet"
          >
            {isSaving ? "Deleting…" : "Confirm delete"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => setConfirmDelete(false)}
            className="border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
            type="button"
            variant="quiet"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            className="min-h-8 rounded px-2 text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-moss"
            onClick={() => {
              setContent(message.content ?? "");
              setError("");
              setIsEditing(true);
            }}
            type="button"
          >
            Edit
          </button>
          <button
            className="min-h-8 rounded px-2 text-xs font-semibold text-white/80 underline-offset-4 hover:text-red-200 hover:underline focus-visible:outline-moss"
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            Delete
          </button>
        </div>
      )}
      {error ? (
        <p         className="mt-1 text-xs leading-5 text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
