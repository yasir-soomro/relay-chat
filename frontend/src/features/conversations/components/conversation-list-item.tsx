import Link from "next/link";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import type { ConversationEntry } from "@/features/conversations/types";

function formatConversationTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const isToday = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat(undefined, {
    ...(isToday ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ConversationListItem({
  entry,
  isSelected = false,
}: {
  entry: ConversationEntry;
  isSelected?: boolean;
}) {
  const { conversation, participant, participantId, latestMessage, messagePreviewError } =
    entry;
  const displayName = participant?.display_name ?? "Relay member";
  const messageTime = latestMessage
    ? formatConversationTime(latestMessage.sent_at)
    : "";
  const preview = messagePreviewError
    ? "Message preview unavailable"
    : !latestMessage
      ? "No messages yet"
      : latestMessage.deleted_at
        ? "Message deleted"
        : latestMessage.content ?? "Message unavailable";
  const unreadCount = conversation.unread_count ?? 0;

  return (
    <li className="messages-inbox-item">
      <Link
        aria-current={isSelected ? "page" : undefined}
        aria-label={`Open conversation with ${displayName}${unreadCount ? `, ${unreadCount} unread messages` : ""}`}
        className={`messages-inbox-link flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2.5 ${
          isSelected ? "messages-inbox-link-selected" : ""
        }`}
        href={`/conversations/${encodeURIComponent(conversation.id)}`}
      >
        <ProfileAvatar
          displayName={displayName}
          size="small"
          username={participant?.username ?? participantId}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-[9px] leading-3 text-muted">
                @{participant?.username ?? "member"}
              </span>
            </span>
            <time
              className="shrink-0 text-[9px] text-muted"
              dateTime={latestMessage?.sent_at}
            >
              {messageTime}
            </time>
          </span>
          <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[10px] leading-4 text-muted">
              {preview}
            </span>
            {unreadCount > 0 ? (
              <span className="messages-unread-badge inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                <span className="sr-only">{unreadCount} unread messages</span>
                <span aria-hidden="true">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
