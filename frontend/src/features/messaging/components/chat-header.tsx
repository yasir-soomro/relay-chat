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
    <header className="flex min-w-0 items-center gap-3 border-b border-line px-4 py-4 sm:px-6">
      <Link
        aria-label="Back to conversations"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-moss motion-reduce:transition-none"
        href="/conversations"
      >
        <span aria-hidden="true">←</span>
      </Link>
      <ConversationParticipant
        compact
        profile={participant}
        userId={participantId}
      />
      <div className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted">
        <span aria-live="polite" role="status">
          {connectionLabels[connectionState]}
        </span>
        {connectionState === "offline" ? (
          <button
            className="rounded px-2 py-1 font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-moss"
            onClick={onReconnect}
            type="button"
          >
            Reconnect
          </button>
        ) : null}
      </div>
      <span className="sr-only">Conversation</span>
    </header>
  );
}
