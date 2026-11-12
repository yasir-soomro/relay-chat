"use client";

import { useEffect, useState, type FocusEvent } from "react";
import Link from "next/link";
import type { IncomingMessageToast } from "@/features/notifications/types";

const toastDurationMs = 8000;

function NotificationToastItem({
  toast,
  onDismiss,
}: {
  toast: IncomingMessageToast;
  onDismiss: (toastId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = setTimeout(() => onDismiss(toast.id), toastDurationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, paused, toast.id]);

  function handleBlur(event: FocusEvent<HTMLLIElement>) {
    const nextTarget = event.relatedTarget;
    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      setFocused(false);
    }
  }

  return (
    <li
      className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-opacity motion-reduce:transition-none"
      onBlurCapture={handleBlur}
      onFocusCapture={() => setFocused(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        aria-label="Open conversation with a new message"
        className="min-w-0 flex-1 rounded-md text-sm font-semibold text-ink focus-visible:outline-moss"
        href={`/conversations/${encodeURIComponent(toast.conversationId)}`}
      >
        <span className="block">New message</span>
        <span className="mt-1 block text-xs font-normal text-muted">
          Open conversation
        </span>
      </Link>
      <button
        aria-label="Dismiss new message notification"
        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-moss motion-reduce:transition-none"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        Dismiss
      </button>
    </li>
  );
}

export function NotificationToasts({
  toasts,
  onDismiss,
}: {
  toasts: IncomingMessageToast[];
  onDismiss: (toastId: string) => void;
}) {
  return (
    <>
      <div
        aria-atomic="false"
        aria-live="polite"
        aria-relevant="additions"
        className="sr-only"
      >
        {toasts.map((toast) => (
          <p key={toast.id}>New message in a conversation.</p>
        ))}
      </div>
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96">
          <ul aria-label="New message notifications" className="grid gap-2">
            {toasts.map((toast) => (
              <NotificationToastItem
                key={toast.id}
                onDismiss={onDismiss}
                toast={toast}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
