import Link from "next/link";
import { surfaceCardClassName } from "@/components/ui/card";
import { ConversationParticipant } from "@/features/conversations/components/conversation-participant";
import type { ConversationEntry } from "@/features/conversations/types";
import { useOptionalNotifications } from "@/features/notifications/providers/notifications-provider";

export function ConversationListItem({ entry }: { entry: ConversationEntry }) {
  const { conversation, participant, participantId } = entry;
  const { items } = useOptionalNotifications();
  const unreadCount =
    items.find((item) => item.conversationId === conversation.id)?.unreadCount ??
    0;

  return (
    <li className={surfaceCardClassName}>
      <Link
        aria-label={`Open conversation with ${participant?.display_name ?? "Relay member"}${unreadCount ? `, ${unreadCount} unread messages` : ""}`}
        className="flex min-h-24 min-w-0 items-center gap-4 rounded-card p-4 transition-colors hover:bg-soft focus-visible:outline-moss sm:p-5"
        href={`/conversations/${encodeURIComponent(conversation.id)}`}
      >
        <ConversationParticipant
          compact
          linkToProfile={false}
          profile={participant}
          userId={participantId}
        />
        {unreadCount > 0 ? (
          <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-moss px-2 py-1 text-xs font-semibold text-white">
            <span className="sr-only">{unreadCount} unread messages</span>
            <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-sm font-semibold text-moss">
          Open
        </span>
      </Link>
    </li>
  );
}
