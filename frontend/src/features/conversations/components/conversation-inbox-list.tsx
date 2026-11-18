import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConversationListItem } from "@/features/conversations/components/conversation-list-item";
import type { ConversationEntry } from "@/features/conversations/types";

type ConversationInboxListProps = {
  entries: ConversationEntry[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  selectedConversationId?: string;
};

export function ConversationInboxList({
  entries,
  isLoading,
  error,
  onRetry,
  selectedConversationId,
}: ConversationInboxListProps) {
  const [query, setQuery] = useState("");
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return entries;
    }
    return entries.filter(({ participant, latestMessage }) =>
      [
        participant?.display_name,
        participant?.username,
        latestMessage?.content,
      ]
        .some(
          (value) =>
            typeof value === "string" &&
            value.toLocaleLowerCase().includes(normalizedQuery),
        ),
    );
  }, [entries, query]);

  if (isLoading) {
    return (
      <div
        aria-label="Loading conversations"
        className="messages-inbox-loading grid gap-3"
        role="status"
      >
        <span className="sr-only">Loading conversations…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            aria-hidden="true"
            className="h-20 animate-pulse rounded-xl bg-soft"
            key={index}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-inbox-state p-5">
        <p className="text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
        <Button className="mt-4" onClick={onRetry} type="button">
          Try again
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="messages-inbox-state px-5 py-8 text-center">
        <h2 className="text-lg font-semibold text-ink">No conversations yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Start a conversation with one of your accepted connections below.
        </p>
      </div>
    );
  }

  return (
    <div className="messages-inbox-content flex min-h-0 flex-1 flex-col">
      <label className="messages-search mx-4 mb-3 flex items-center gap-2.5 rounded-xl bg-soft px-3">
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 text-muted"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
        <span className="sr-only">Search conversations</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-xs text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search messages"
          type="search"
          value={query}
        />
      </label>
      {filteredEntries.length ? (
        <ul aria-label="Your conversations" className="messages-inbox-list min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {filteredEntries.map((entry) => (
            <ConversationListItem
              entry={entry}
              isSelected={entry.conversation.id === selectedConversationId}
              key={entry.conversation.id}
            />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-center text-xs text-muted" role="status">
          No conversations match “{query.trim()}”.
        </p>
      )}
    </div>
  );
}
