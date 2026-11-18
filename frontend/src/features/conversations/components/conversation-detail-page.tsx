"use client";

import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/button";
import { useConversation } from "@/features/conversations/hooks/use-conversation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { MessageComposer } from "@/features/messaging/components/message-composer";
import { ChatHeader } from "@/features/messaging/components/chat-header";
import { MessageTimeline } from "@/features/messaging/components/message-timeline";
import { useMessages } from "@/features/messaging/hooks/use-messages";

type ConversationDetailPageProps = {
  conversationId: string;
  embedded?: boolean;
  isAcceptedConnection?: boolean;
};

export function ConversationDetailPage({
  conversationId,
  embedded = false,
  isAcceptedConnection,
}: ConversationDetailPageProps) {
  const { account, authenticatedFetch } = useAuth();
  const currentUserId = account?.id ?? "";
  const conversation = useConversation(
    authenticatedFetch,
    conversationId,
    currentUserId,
  );
  const messages = useMessages(
    authenticatedFetch,
    conversationId,
    currentUserId,
    conversation.conversation !== null,
  );

  if (conversation.isLoading) {
    return (
      <section
        aria-label="Opening conversation"
        className={
          embedded
            ? "messages-detail-loading"
            : "mx-auto max-w-5xl"
        }
        role="status"
      >
        <div
          className={`h-[min(70vh,48rem)] min-h-80 animate-pulse rounded-card bg-surface ${
            embedded ? "messages-detail-loading-panel" : "border border-line"
          }`}
        >
          <span className="sr-only">Opening conversation…</span>
        </div>
      </section>
    );
  }

  if (conversation.error || !conversation.conversation) {
    return (
      <section
        aria-labelledby="conversation-error-heading"
        className={
          embedded
            ? "messages-detail-error"
            : "mx-auto max-w-4xl"
        }
      >
        <div
          className={`rounded-card bg-surface p-6 sm:p-8 ${
            embedded ? "messages-detail-error-panel" : "border border-line"
          }`}
        >
          <h1
            className="text-xl font-semibold text-ink"
            id="conversation-error-heading"
          >
            Conversation unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-danger" role="alert">
            {conversation.error || "This conversation could not be found."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={conversation.reload} type="button">
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
      </section>
    );
  }

  const otherParticipantId =
    conversation.conversation.user_low_id === currentUserId
      ? conversation.conversation.user_high_id
      : conversation.conversation.user_low_id;
  const liveUpdateState =
    messages.connectionState === "connected"
      ? "active"
      : messages.connectionState;

  return (
    <section
      aria-label={`Conversation with ${conversation.participant?.display_name ?? "Relay member"}`}
      className={
        embedded
          ? "messages-detail-embedded flex min-h-0 min-w-0 flex-1 flex-col"
          : "mx-auto flex h-[calc(100dvh-12rem)] min-h-[28rem] max-h-[56rem] max-w-5xl flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-card md:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-6rem)]"
      }
    >
      <ChatHeader
        participant={conversation.participant}
        participantId={otherParticipantId}
        connectionState={messages.connectionState}
        onReconnect={messages.reconnect}
      />
      <div
        className={`messages-connection-banner ${messages.connectionState === "connected" ? "messages-connection-live" : ""}`}
        role="status"
      >
        <span aria-hidden="true">●</span>
        <span>
          {isAcceptedConnection
            ? `You're connected with ${conversation.participant?.display_name ?? "this member"}. `
            : ""}
          Live updates are {liveUpdateState} for this conversation.
        </span>
      </div>

      {messages.isLoading ? (
        <div
          aria-label="Loading messages"
          className="grid min-h-0 flex-1 content-end gap-3 overflow-hidden px-4 py-6 sm:px-6"
          role="status"
        >
          <span className="sr-only">Loading messages…</span>
          <div className="h-16 w-3/5 animate-pulse rounded-2xl bg-soft" />
          <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-soft" />
          <div className="h-12 w-1/2 animate-pulse rounded-2xl bg-soft" />
        </div>
      ) : messages.error ? (
        <div className="grid min-h-0 flex-1 place-content-center px-6 text-center">
          <h2 className="font-semibold text-ink">Messages could not load</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-danger" role="alert">
            {messages.error}
          </p>
          <Button className="mx-auto mt-4" onClick={messages.reload} type="button">
            Try again
          </Button>
        </div>
      ) : (
        <MessageTimeline
          currentUserId={currentUserId}
          hasOlder={messages.hasOlder}
          isLoadingOlder={messages.isLoadingOlder}
          messages={messages.messages}
          onDelete={messages.remove}
          onEdit={messages.edit}
          onLoadOlder={messages.loadOlder}
          olderError={messages.olderError}
        />
      )}

      <MessageComposer
        canSend={messages.canSend && !messages.isLoading && !messages.error}
        error={messages.sendError}
        onSend={messages.send}
      />
      <div className="sr-only" aria-live="polite">
        {messages.messages.length} messages in this conversation.
      </div>
    </section>
  );
}
