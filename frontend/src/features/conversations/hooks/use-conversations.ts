"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicProfile } from "@/features/users/api";
import { listConversations } from "@/features/conversations/api";
import { listMessages } from "@/features/messaging/api";
import type {
  Conversation,
  ConversationEntry,
} from "@/features/conversations/types";
import type { AuthenticatedRequest } from "@/features/users/types";

type ConversationState = {
  key: string;
  entries: ConversationEntry[];
  isLoading: boolean;
  error: string;
};

function otherParticipantId(conversation: Conversation, currentUserId: string) {
  return conversation.user_low_id === currentUserId
    ? conversation.user_high_id
    : conversation.user_low_id;
}

export function useConversations(
  authenticatedFetch: AuthenticatedRequest,
  currentUserId: string,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ConversationState>({
    key: "",
    entries: [],
    isLoading: true,
    error: "",
  });
  const key = `${currentUserId}:${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();

    void listConversations(authenticatedFetch, controller.signal)
      .then(async ({ items }) => {
        const results = await Promise.all(
          items.map(async (conversation) => {
            const participantId = otherParticipantId(conversation, currentUserId);
            const [participantResult, messageResult] = await Promise.allSettled([
              getPublicProfile(
                authenticatedFetch,
                participantId,
                controller.signal,
              ),
              listMessages(
                authenticatedFetch,
                conversation.id,
                { limit: 1 },
                controller.signal,
              ),
            ]);
            if (controller.signal.aborted) {
              throw new DOMException("Request aborted", "AbortError");
            }
            return {
              conversation,
              participantId,
              participant:
                participantResult.status === "fulfilled"
                  ? participantResult.value
                  : null,
              latestMessage:
                messageResult.status === "fulfilled"
                  ? messageResult.value.items[
                      messageResult.value.items.length - 1
                    ] ?? null
                  : null,
              messagePreviewError:
                messageResult.status === "rejected" &&
                messageResult.reason instanceof Error
                  ? messageResult.reason.message
                  : messageResult.status === "rejected"
                    ? "Message preview is unavailable."
                    : "",
            };
          }),
        );
        if (!controller.signal.aborted) {
          setState({ key, entries: results, isLoading: false, error: "" });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            key,
            entries: [],
            isLoading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "We could not load your conversations. Please try again.",
          });
        }
      });

    return () => controller.abort();
  }, [authenticatedFetch, currentUserId, key]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const isCurrentState = state.key === key;
  return {
    entries: isCurrentState ? state.entries : [],
    error: isCurrentState ? state.error : "",
    isLoading: !isCurrentState || state.isLoading,
    reload,
  };
}
