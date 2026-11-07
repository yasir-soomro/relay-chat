"use client";

import { useCallback, useEffect, useState } from "react";
import { getConversation } from "@/features/conversations/api";
import type { Conversation } from "@/features/conversations/types";
import { getPublicProfile } from "@/features/users/api";
import type { UserProfile } from "@/features/users/types";

type ConversationDetailState = {
  key: string;
  conversation: Conversation | null;
  participant: UserProfile | null;
  isLoading: boolean;
  error: string;
};

export function useConversation(
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  conversationId: string,
  currentUserId: string,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${currentUserId}:${conversationId}:${reloadKey}`;
  const [state, setState] = useState<ConversationDetailState>({
    key: "",
    conversation: null,
    participant: null,
    isLoading: true,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    void getConversation(authenticatedFetch, conversationId, controller.signal)
      .then(async (result) => {
        const participantId =
          result.user_low_id === currentUserId
            ? result.user_high_id
            : result.user_low_id;
        const profile = await getPublicProfile(
          authenticatedFetch,
          participantId,
          controller.signal,
        ).catch((cause: unknown) => {
          if (controller.signal.aborted) {
            throw cause;
          }
          return null;
        });
        if (!controller.signal.aborted) {
          setState({
            key,
            conversation: result,
            participant: profile,
            isLoading: false,
            error: "",
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            key,
            conversation: null,
            participant: null,
            isLoading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "We could not open this conversation. Please try again.",
          });
        }
      })

    return () => controller.abort();
  }, [authenticatedFetch, conversationId, currentUserId, key]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const isCurrentState = state.key === key;
  return {
    conversation: isCurrentState ? state.conversation : null,
    participant: isCurrentState ? state.participant : null,
    isLoading: !isCurrentState || state.isLoading,
    error: isCurrentState ? state.error : "",
    reload,
  };
}
