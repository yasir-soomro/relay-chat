"use client";

import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConversationParticipant } from "@/features/conversations/components/conversation-participant";
import { useConversation } from "@/features/conversations/hooks/use-conversation";
import { useAuth } from "@/features/auth/providers/auth-provider";

type ConversationDetailPageProps = {
  conversationId: string;
};

export function ConversationDetailPage({
  conversationId,
}: ConversationDetailPageProps) {
  const { account, authenticatedFetch } = useAuth();
  const result = useConversation(
    authenticatedFetch,
    conversationId,
    account?.id ?? "",
  );

  return (
    <section aria-labelledby="conversation-heading" className="mx-auto max-w-4xl">
      <Link
        className="inline-flex min-h-10 items-center text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-moss"
        href="/conversations"
      >
        Back to conversations
      </Link>
      {result.isLoading ? (
        <div
          aria-label="Opening conversation"
          className="mt-6 h-36 animate-pulse rounded-card border border-line bg-surface"
          role="status"
        >
          <span className="sr-only">Opening conversation…</span>
        </div>
      ) : result.error ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-6">
          <h1
            className="text-xl font-semibold text-ink"
            id="conversation-heading"
          >
            Conversation unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#8e3027]" role="alert">
            {result.error}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={result.reload} type="button">
              Try again
            </Button>
            <Link
              className={buttonClassName("secondary")}
              href="/conversations"
            >
              Return to inbox
            </Link>
          </div>
        </div>
      ) : result.conversation ? (
        <>
          <h1
            className="mt-5 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
            id="conversation-heading"
          >
            Conversation
          </h1>
          <div className="mt-6 rounded-card border border-line bg-surface p-5 sm:p-7">
            <ConversationParticipant
              profile={result.participant}
              userId={
                result.conversation.user_low_id === account?.id
                  ? result.conversation.user_high_id
                  : result.conversation.user_low_id
              }
            />
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="font-semibold text-ink">Conversation ready</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Message history and sending are not available in this view yet.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
