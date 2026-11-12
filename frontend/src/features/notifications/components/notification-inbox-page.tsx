"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/features/notifications/providers/notifications-provider";

export function NotificationInboxPage() {
  const { items, isLoading, error, retry, unreadCount } = useNotifications();

  return (
    <section aria-labelledby="notifications-heading" className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-moss">Your activity</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="notifications-heading"
      >
        Notifications
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
        Unread messages across your conversations. Opening a conversation marks
        messages as read on your account.
      </p>

      {isLoading ? (
        <div
          aria-label="Loading notifications"
          className="mt-7 grid gap-3"
          role="status"
        >
          <span className="sr-only">Loading notifications…</span>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              aria-hidden="true"
              className="h-20 animate-pulse rounded-card border border-line bg-surface"
              key={index}
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-7 rounded-card border border-line bg-surface p-6">
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
            {error}
          </p>
          <Button className="mt-4" onClick={retry} type="button">
            Try again
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="mt-7 rounded-card border border-line bg-surface px-6 py-8 text-center sm:px-8">
          <h2 className="text-lg font-semibold text-ink">You’re all caught up</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            New unread messages will appear here.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul
          aria-label={`${unreadCount} unread messages`}
          className="mt-7 grid gap-3"
        >
          {items.map((item) => (
            <li
              className="rounded-card border border-line bg-surface shadow-card"
              key={item.conversationId}
            >
              <Link
                aria-label={`${item.unreadCount} unread messages. Open conversation.`}
                className="flex min-h-20 items-center justify-between gap-4 rounded-card p-4 transition-colors hover:bg-soft focus-visible:outline-moss sm:p-5"
                href={`/conversations/${encodeURIComponent(item.conversationId)}`}
              >
                <span>
                  <span className="block font-semibold text-ink">
                    {item.unreadCount} unread{" "}
                    {item.unreadCount === 1 ? "message" : "messages"}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-sm font-semibold text-moss"
                >
                  Open
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
