import Link from "next/link";
import { surfaceCardClassName } from "@/components/ui/card";
import { ConversationParticipant } from "@/features/conversations/components/conversation-participant";
import type { ConversationEntry } from "@/features/conversations/types";

export function ConversationListItem({ entry }: { entry: ConversationEntry }) {
  const { conversation, participant, participantId } = entry;

  return (
    <li className={surfaceCardClassName}>
      <Link
        aria-label={`Open conversation with ${participant?.display_name ?? "Relay member"}`}
        className="flex min-h-24 min-w-0 items-center gap-4 rounded-card p-4 transition-colors hover:bg-soft focus-visible:outline-moss sm:p-5"
        href={`/conversations/${encodeURIComponent(conversation.id)}`}
      >
        <ConversationParticipant
          compact
          linkToProfile={false}
          profile={participant}
          userId={participantId}
        />
        <span className="ml-auto shrink-0 text-sm font-semibold text-moss">
          Open
        </span>
      </Link>
    </li>
  );
}
