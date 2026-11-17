"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ConversationDetailPage } from "@/features/conversations/components/conversation-detail-page";
import { ConversationInboxList } from "@/features/conversations/components/conversation-inbox-list";
import { StartConversationList } from "@/features/conversations/components/start-conversation-list";
import { useConversationContacts } from "@/features/conversations/hooks/use-conversation-contacts";
import { useConversations } from "@/features/conversations/hooks/use-conversations";
import { useConnections } from "@/features/connections/providers/connections-provider";

type ConversationsPageProps = {
  selectedConversationId?: string;
};

export function ConversationsPage({
  selectedConversationId,
}: ConversationsPageProps) {
  const { account, authenticatedFetch } = useAuth();
  const connections = useConnections();
  const currentUserId = account?.id ?? "";
  const inbox = useConversations(authenticatedFetch, currentUserId);
  const contacts = useConversationContacts(
    authenticatedFetch,
    connections.accepted,
    currentUserId,
  );
  const activeConversationId =
    selectedConversationId ?? inbox.entries[0]?.conversation.id;
  const activeEntry = inbox.entries.find(
    ({ conversation }) => conversation.id === activeConversationId,
  );
  const activeConversation = activeEntry !== undefined;
  const isAcceptedConnection =
    !connections.isLoading && activeEntry
      ? connections.accepted.some(
          (connection) =>
            connection.requester_id === activeEntry.participantId ||
            connection.recipient_id === activeEntry.participantId,
        )
      : undefined;

  return (
    <section
      aria-labelledby="messages-heading"
      className="messages-page"
      data-mobile-view={selectedConversationId ? "chat" : "inbox"}
    >
      <header className="messages-page-heading mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Good to hear from you
        </p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl"
          id="messages-heading"
        >
          Your conversations
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
          A private space for you and your connections.
        </p>
      </header>

      <div
        className="messages-workspace"
        data-mobile-view={selectedConversationId ? "chat" : "inbox"}
      >
        <aside aria-label="Conversation inbox" className="messages-inbox-panel">
          <div className="messages-inbox-heading flex items-center justify-between px-4 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Messages</h2>
            {!inbox.isLoading && !inbox.error ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                {inbox.entries.length}
              </span>
            ) : null}
          </div>
          <ConversationInboxList
            entries={inbox.entries}
            error={inbox.error}
            isLoading={inbox.isLoading}
            onRetry={inbox.reload}
            selectedConversationId={
              activeConversation ? activeConversationId : undefined
            }
          />
          {!inbox.isLoading && !inbox.error && inbox.entries.length > 0 ? (
            <div className="messages-inbox-footer">
              <p className="text-xs font-semibold text-ink">
                Something good starts with a simple hello.
              </p>
              <p className="mt-1.5 text-[10px] leading-4 text-muted">
                Discover people and connect to start a new conversation.
              </p>
              <Link
                className="mt-2 inline-flex text-[10px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                href="/discover"
              >
                Discover people <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </div>
          ) : null}
        </aside>

        <section aria-label="Active conversation" className="messages-chat-panel">
          {activeConversationId ? (
            <ConversationDetailPage
              conversationId={activeConversationId}
              embedded
              isAcceptedConnection={isAcceptedConnection}
            />
          ) : (
            <div className="messages-chat-empty">
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-2xl bg-accent text-primary"
              >
                <svg fill="none" viewBox="0 0 24 24" className="size-6">
                  <path
                    d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.2A7.5 7.5 0 1 1 20 11.5Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </span>
              <h2 className="mt-4 text-sm font-semibold text-ink">
                Your messages live here
              </h2>
              <p className="mt-1 max-w-xs text-center text-xs leading-5 text-muted">
                Start a conversation with one of your accepted connections.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="messages-start-section">
        <StartConversationList
          authenticatedFetch={authenticatedFetch}
          contacts={contacts.contacts}
          isLoading={connections.isLoading || contacts.isLoading}
          connectionError={connections.error}
          onConnectionRetry={connections.reload}
        />
      </div>
    </section>
  );
}
