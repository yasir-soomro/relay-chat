"use client";

import { useEffect, useState } from "react";
import { getPublicProfile } from "@/features/users/api";
import type { ConnectionRecord } from "@/features/connections/types";
import type { ConversationContact } from "@/features/conversations/types";
import type { AuthenticatedRequest } from "@/features/users/types";

type ContactState = {
  key: string;
  contacts: ConversationContact[];
  isLoading: boolean;
};

export function useConversationContacts(
  authenticatedFetch: AuthenticatedRequest,
  accepted: ConnectionRecord[],
  currentUserId: string,
) {
  const [state, setState] = useState<ContactState>({
    key: "",
    contacts: [],
    isLoading: false,
  });
  const key = `${currentUserId}:${accepted.map((item) => item.id).join(",")}`;

  useEffect(() => {
    const controller = new AbortController();
    if (accepted.length === 0) {
      return () => controller.abort();
    }

    void Promise.all(
      accepted.map(async (connection) => {
        const userId =
          connection.requester_id === currentUserId
            ? connection.recipient_id
            : connection.requester_id;
        try {
          return {
            userId,
            profile: await getPublicProfile(
              authenticatedFetch,
              userId,
              controller.signal,
            ),
          };
        } catch (cause) {
          if (controller.signal.aborted) {
            throw cause;
          }
          return { userId, profile: null };
        }
      }),
    )
      .then((results) => {
        if (!controller.signal.aborted) {
          setState({ key, contacts: results, isLoading: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            key,
            contacts: accepted.map((connection) => ({
              userId:
                connection.requester_id === currentUserId
                  ? connection.recipient_id
                  : connection.requester_id,
              profile: null,
            })),
            isLoading: false,
          });
        }
      });

    return () => controller.abort();
  }, [accepted, authenticatedFetch, currentUserId, key]);

  const isCurrentState = state.key === key;
  return {
    contacts: accepted.length === 0
      ? []
      : isCurrentState
        ? state.contacts
        : [],
    isLoading:
      accepted.length > 0 && (!isCurrentState || state.isLoading),
  };
}
