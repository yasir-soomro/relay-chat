"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { ConversationParticipant } from "@/features/conversations/components/conversation-participant";
import { createOrGetConversation } from "@/features/conversations/api";
import type { ConversationContact } from "@/features/conversations/types";
import type { AuthenticatedRequest } from "@/features/users/types";

type StartConversationListProps = {
  contacts: ConversationContact[];
  authenticatedFetch: AuthenticatedRequest;
  isLoading: boolean;
  connectionError: string;
  onConnectionRetry: () => void;
};

export function StartConversationList({
  contacts,
  authenticatedFetch,
  isLoading,
  connectionError,
  onConnectionRetry,
}: StartConversationListProps) {
  const router = useRouter();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function startConversation(userId: string) {
    setCreatingId(userId);
    setError("");
    try {
      const conversation = await createOrGetConversation(
        authenticatedFetch,
        userId,
      );
      router.push(`/conversations/${encodeURIComponent(conversation.id)}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not start this conversation. Please try again.",
      );
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <section aria-labelledby="start-conversation-heading" className="mt-10">
      <div>
        <h2
          className="text-xl font-semibold tracking-tight text-ink"
          id="start-conversation-heading"
        >
          Start a conversation
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Choose someone you are connected with.
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm leading-6 text-[#8e3027]" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div
          aria-label="Loading connections"
          className="mt-4 h-20 animate-pulse rounded-card border border-line bg-surface"
          role="status"
        >
          <span className="sr-only">Loading connections…</span>
        </div>
      ) : connectionError ? (
        <div className="mt-4 rounded-card border border-line bg-surface px-5 py-6">
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
            {connectionError}
          </p>
          <Button
            className="mt-4"
            onClick={onConnectionRetry}
            type="button"
            variant="secondary"
          >
            Try again
          </Button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface px-5 py-6">
          <p className="text-sm leading-6 text-muted">
            You do not have any accepted connections to start a conversation
            with yet.
          </p>
          <Button
            className="mt-4"
            onClick={onConnectionRetry}
            type="button"
            variant="secondary"
          >
            Refresh connections
          </Button>
        </div>
      ) : (
        <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {contacts.map(({ userId, profile }) => (
            <li
              className={`${surfaceCardClassName} flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between`}
              key={userId}
            >
              <ConversationParticipant
                compact
                profile={profile}
                userId={userId}
              />
              <Button
                className="shrink-0"
                disabled={creatingId !== null}
                onClick={() => void startConversation(userId)}
                type="button"
                variant="secondary"
              >
                {creatingId === userId ? "Opening…" : "Start conversation"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
