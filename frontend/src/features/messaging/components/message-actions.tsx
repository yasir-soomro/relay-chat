"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    <div className="relative mt-1" ref={containerRef}>
      {!isEditing && !confirmDelete ? (
        <div className="flex justify-end">
          <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Message options" className="grid size-8 place-items-center rounded-full text-current/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }} type="button">
            <span aria-hidden="true" className="text-lg leading-none">⋯</span>
          </button>
        </div>
      ) : null}
      {menuOpen && !isEditing && !confirmDelete ? (
        <div className="message-context-menu absolute right-0 top-9 z-30 min-w-36 rounded-xl border border-line bg-surface p-1 text-ink shadow-card" role="menu">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-soft focus-visible:outline-focus" onClick={() => { setContent(message.content ?? ""); setError(""); setMenuOpen(false); setIsEditing(true); }} role="menuitem" type="button">Edit</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-focus" onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} role="menuitem" type="button">Delete</button>
        </div>
      ) : null}
      {isEditing ? (
        <form className="flex flex-col gap-2" onSubmit={saveEdit}>
          <label className="sr-only" htmlFor={`edit-${message.id}`}>
            Edit message
          </label>
          <textarea
            autoFocus
            className="min-h-20 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink focus:border-focus focus:outline-none"
            id={`edit-${message.id}`}
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-surface text-ink hover:bg-soft"
              disabled={isSaving || !content.trim()}
              loading={isSaving}
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
              className="border-primary-foreground/30 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              type="button"
              variant="quiet"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div aria-label="Confirm message deletion" aria-modal="true" className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft p-2" role="alertdialog">
          <span className="mr-1 text-xs text-danger">Delete this message?</span>
          <Button
            disabled={isSaving}
            onClick={() => void deleteOwnMessage()}
            className="border-primary-foreground/30 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            loading={isSaving}
            type="button"
            variant="destructive"
          >
            {isSaving ? "Deleting…" : "Confirm delete"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => setConfirmDelete(false)}
            className="border-primary-foreground/30 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            type="button"
            variant="quiet"
          >
            Cancel
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-1 rounded bg-danger-soft px-2 py-1 text-xs leading-5 text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
