import { Button } from "@/components/ui/button";
import { ConversationListItem } from "@/features/conversations/components/conversation-list-item";
import type { ConversationEntry } from "@/features/conversations/types";

type ConversationInboxListProps = {
  entries: ConversationEntry[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
};

export function ConversationInboxList({
  entries,
  isLoading,
  error,
  onRetry,
}: ConversationInboxListProps) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading conversations"
        className="mt-7 grid gap-3"
        role="status"
      >
        <span className="sr-only">Loading conversations…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            aria-hidden="true"
            className="h-24 animate-pulse rounded-card border border-line bg-surface"
            key={index}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-7 rounded-card border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm leading-6 text-[#8e3027]" role="alert">
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
      <div className="mt-7 rounded-card border border-line bg-surface px-6 py-8 text-center sm:px-8">
        <h2 className="text-lg font-semibold text-ink">No conversations yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Start a conversation with one of your accepted connections below.
        </p>
      </div>
    );
  }

  return (
    <ul aria-label="Your conversations" className="mt-7 grid gap-3">
      {entries.map((entry) => (
        <ConversationListItem entry={entry} key={entry.conversation.id} />
      ))}
    </ul>
  );
}
