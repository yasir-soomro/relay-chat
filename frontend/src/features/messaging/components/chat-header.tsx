import Link from "next/link";
import { ConversationParticipant } from "@/features/conversations/components/conversation-participant";
import type { UserProfile } from "@/features/users/types";
import type { ConnectionState } from "@/features/messaging/websocket/connection-manager";

type ChatHeaderProps = {
  participant: UserProfile | null;
  participantId: string;
  connectionState: ConnectionState;
  onReconnect: () => void;
};

const connectionLabels: Record<ConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

export function ChatHeader({
  participant,
  participantId,
  connectionState,
  onReconnect,
}: ChatHeaderProps) {
  return (
    <header className="messages-chat-header flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
      <Link
        aria-label="Back to conversations"
        className="messages-back-link inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-focus motion-reduce:transition-none"
        href="/conversations"
      >
        <span aria-hidden="true">←</span>
      </Link>
      <ConversationParticipant
        compact
        linkToProfile={false}
        profile={participant}
        userId={participantId}
      />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {participant ? (
          <Link
            className="messages-view-profile rounded-lg px-2.5 py-2 text-[10px] font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            href={`/app/users/${encodeURIComponent(participantId)}`}
          >
            View profile <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
        {connectionState === "offline" ? (
          <button
            className="messages-reconnect rounded-lg px-2 py-2 text-[10px] font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onClick={onReconnect}
            type="button"
          >
            Reconnect
          </button>
        ) : null}
      </div>
      <span className="sr-only">{connectionLabels[connectionState]}</span>
    </header>
  );
}
