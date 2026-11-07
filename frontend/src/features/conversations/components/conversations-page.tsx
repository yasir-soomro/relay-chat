"use client";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { ConversationInboxList } from "@/features/conversations/components/conversation-inbox-list";
import { StartConversationList } from "@/features/conversations/components/start-conversation-list";
import { useConversationContacts } from "@/features/conversations/hooks/use-conversation-contacts";
import { useConversations } from "@/features/conversations/hooks/use-conversations";
import { useConnections } from "@/features/connections/providers/connections-provider";

export function ConversationsPage() {
  const { account, authenticatedFetch } = useAuth();
  const connections = useConnections();
  const currentUserId = account?.id ?? "";
  const inbox = useConversations(authenticatedFetch, currentUserId);
  const contacts = useConversationContacts(
    authenticatedFetch,
    connections.accepted,
    currentUserId,
  );

  return (
    <section aria-labelledby="conversations-heading" className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-moss">Your messages</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="conversations-heading"
      >
        Conversations
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
        Pick up a conversation or start a new one with a connection.
      </p>

      <section aria-labelledby="inbox-heading" className="mt-8">
        <div>
          <h2
            className="text-xl font-semibold tracking-tight text-ink"
            id="inbox-heading"
          >
            Your inbox
          </h2>
          {!inbox.isLoading && !inbox.error ? (
            <p className="mt-1 text-sm text-muted">
              {inbox.entries.length}{" "}
              {inbox.entries.length === 1 ? "conversation" : "conversations"}
            </p>
          ) : null}
        </div>
        <ConversationInboxList
          entries={inbox.entries}
          error={inbox.error}
          isLoading={inbox.isLoading}
          onRetry={inbox.reload}
        />
      </section>

      <StartConversationList
        authenticatedFetch={authenticatedFetch}
        contacts={contacts.contacts}
        isLoading={connections.isLoading || contacts.isLoading}
        connectionError={connections.error}
        onConnectionRetry={connections.reload}
      />
    </section>
  );
}
