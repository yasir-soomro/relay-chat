"use client";

import { useCallback, useEffect, useRef } from "react";
import { listMessages } from "@/features/messaging/api";
import type { MessageRecord } from "@/features/messaging/types";
import {
  useMessagingRealtime,
} from "@/features/messaging/providers/messaging-provider";
import type { AuthenticatedRequest } from "@/features/users/types";

type UseRealtimeConversationOptions = {
  authenticatedFetch: AuthenticatedRequest;
  conversationId: string;
  enabled: boolean;
  onMessage: (message: MessageRecord) => void;
  onStatus: (status: {
    id: string;
    status: MessageRecord["status"];
    sent_at: string;
    delivered_at: string | null;
    read_at: string | null;
  }) => void;
  onError: (message: string) => void;
  onHistoryRecovered: () => void;
};

export function useRealtimeConversation({
  authenticatedFetch,
  conversationId,
  enabled,
  onMessage,
  onStatus,
  onError,
  onHistoryRecovered,
}: UseRealtimeConversationOptions) {
  const realtime = useMessagingRealtime();
  const callbacks = useRef({
    onMessage,
    onStatus,
    onError,
    onHistoryRecovered,
  });
  const fetchRef = useRef(authenticatedFetch);

  useEffect(() => {
    callbacks.current = { onMessage, onStatus, onError, onHistoryRecovered };
    fetchRef.current = authenticatedFetch;
  }, [authenticatedFetch, onError, onHistoryRecovered, onMessage, onStatus]);

  const recoverHistory = useCallback(
    async (signal: AbortSignal) => {
      let cursor: string | undefined;
      do {
        const page = await listMessages(
          fetchRef.current,
          conversationId,
          { limit: 100, cursor },
          signal,
        );
        for (const message of page.items) {
          callbacks.current.onMessage(message);
        }
        cursor = page.next_cursor ?? undefined;
      } while (cursor && !signal.aborted);
      if (!signal.aborted) {
        callbacks.current.onHistoryRecovered();
      }
    },
    [conversationId],
  );

  useEffect(() => {
    const manager = realtime?.manager;
    if (!enabled || !manager) {
      return;
    }

    const controller = new AbortController();
    const unsubscribe = manager.subscribe(conversationId, {
      onEvent: (event) => {
        if (event.type === "message.sent" || event.type === "message.received") {
          callbacks.current.onMessage(event.message);
        } else if (event.type === "message.status") {
          callbacks.current.onStatus(event.status);
        } else if (event.type === "error") {
          callbacks.current.onError(event.detail);
        }
      },
      onSubscribed: () => {
        void recoverHistory(controller.signal).catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            callbacks.current.onError(
              cause instanceof Error
                ? `Some recent messages could not be recovered: ${cause.message}`
                : "Some recent messages could not be recovered.",
            );
          }
        });
      },
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [conversationId, enabled, realtime?.manager, recoverHistory]);

  return realtime;
}
