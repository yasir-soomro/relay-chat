"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { listConversations } from "@/features/conversations/api";
import { getUnreadCount } from "@/features/notifications/api";
import type {
  ConversationNotification,
  IncomingMessageToast,
  NotificationState,
} from "@/features/notifications/types";
import { useMessagingRealtime } from "@/features/messaging/providers/messaging-provider";
import type { ServerEvent } from "@/features/messaging/websocket/events";

type InternalNotificationState = NotificationState & {
  userId: string | null;
};

const maximumToasts = 3;

function notificationItems(
  conversations: Awaited<ReturnType<typeof listConversations>>["items"],
): ConversationNotification[] {
  return conversations
    .filter((conversation) => conversation.unread_count > 0)
    .map((conversation) => ({
      conversationId: conversation.id,
      unreadCount: conversation.unread_count,
    }));
}

function rememberMessage(messages: Set<string>, messageId: string): boolean {
  if (messages.has(messageId)) {
    return false;
  }
  messages.add(messageId);
  return true;
}

export function useNotificationState() {
  const { account, authenticatedFetch, status: authStatus } = useAuth();
  const realtime = useMessagingRealtime();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<InternalNotificationState>({
    userId: null,
    items: [],
    unreadCount: 0,
    isLoading: true,
    error: "",
    toasts: [],
  });
  const activeUserId = useRef<string | null>(null);
  const eventRevision = useRef(0);
  const recentIncomingMessages = useRef(new Set<string>());
  const optimisticIncomingMessages = useRef(new Map<string, string>());

  useEffect(() => {
    const userId = account?.id;
    const manager = realtime?.manager;
    if (authStatus !== "authenticated" || !userId || !manager) {
      activeUserId.current = null;
      eventRevision.current = 0;
      recentIncomingMessages.current.clear();
      optimisticIncomingMessages.current.clear();
      setState({
        userId: null,
        items: [],
        unreadCount: 0,
        isLoading: authStatus === "authenticated",
        error: "",
        toasts: [],
      });
      return;
    }

    if (activeUserId.current !== userId) {
      activeUserId.current = userId;
      eventRevision.current = 0;
      recentIncomingMessages.current.clear();
      optimisticIncomingMessages.current.clear();
    }

    const controller = new AbortController();
    const unsubscribers: Array<() => void> = [];
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let requestSequence = 0;
    let subscribed = false;

    setState({
      userId,
      items: [],
      unreadCount: 0,
      isLoading: true,
      error: "",
      toasts: [],
    });

    const refresh = async () => {
      const sequence = ++requestSequence;
      const revision = eventRevision.current;
      try {
        const [conversations, total] = await Promise.all([
          listConversations(authenticatedFetch, controller.signal),
          getUnreadCount(authenticatedFetch, controller.signal),
        ]);
        if (controller.signal.aborted || sequence !== requestSequence) {
          return;
        }
        if (revision !== eventRevision.current) {
          scheduleRefresh();
          return;
        }

        optimisticIncomingMessages.current.clear();
        setState((current) => ({
          ...current,
          userId,
          items: notificationItems(conversations.items),
          unreadCount: total.total_unread_count,
          isLoading: false,
          error: "",
        }));

        if (!subscribed) {
          subscribed = true;
          for (const conversation of conversations.items) {
            unsubscribers.push(
              manager.subscribe(conversation.id, {
                onEvent: (event) => {
                  if (activeUserId.current !== userId) {
                    return;
                  }
                  if (event.type === "error") {
                    setState((current) => ({
                      ...current,
                      userId,
                      error: event.detail,
                    }));
                  } else if (event.type === "message.received") {
                    handleIncomingMessage(event, userId);
                  } else if (
                    event.type === "message.status" &&
                    event.status.status === "read"
                  ) {
                    handleReadStatus(event, userId);
                  }
                },
                onSubscribed: scheduleRefresh,
              }),
            );
          }
        }
      } catch (cause) {
        if (
          !controller.signal.aborted &&
          sequence === requestSequence &&
          revision === eventRevision.current
        ) {
          setState((current) => ({
            ...current,
            userId,
            isLoading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "Notifications could not be loaded.",
          }));
        }
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        void refresh();
      }, 100);
    };

    const handleIncomingMessage = (
      event: Extract<ServerEvent, { type: "message.received" }>,
      authenticatedUserId: string,
    ) => {
      const { message } = event;
      if (
        message.sender_id === authenticatedUserId ||
        message.status === "read" ||
        message.deleted_at !== null ||
        !rememberMessage(recentIncomingMessages.current, message.id)
      ) {
        return;
      }

      eventRevision.current += 1;
      optimisticIncomingMessages.current.set(
        message.id,
        message.conversation_id,
      );
      if (optimisticIncomingMessages.current.size > maximumToasts * 2) {
        const oldestMessageId = optimisticIncomingMessages.current
          .keys()
          .next().value;
        if (oldestMessageId) {
          optimisticIncomingMessages.current.delete(oldestMessageId);
        }
      }
      const toast: IncomingMessageToast = {
        id: message.id,
        conversationId: message.conversation_id,
      };
      setState((current) => {
        if (current.userId !== authenticatedUserId) {
          return current;
        }
        const existing = current.items.find(
          (item) => item.conversationId === message.conversation_id,
        );
        const items = existing
          ? current.items.map((item) =>
              item.conversationId === message.conversation_id
                ? { ...item, unreadCount: item.unreadCount + 1 }
                : item,
            )
          : [
              ...current.items,
              { conversationId: message.conversation_id, unreadCount: 1 },
            ];
        return {
          ...current,
          items,
          unreadCount: current.unreadCount + 1,
          toasts: [
            ...current.toasts.filter((item) => item.id !== toast.id),
            toast,
          ].slice(-maximumToasts),
        };
      });
      scheduleRefresh();
    };

    const handleReadStatus = (
      event: Extract<ServerEvent, { type: "message.status" }>,
      authenticatedUserId: string,
    ) => {
      eventRevision.current += 1;
      const conversationId = optimisticIncomingMessages.current.get(
        event.status.id,
      );
      optimisticIncomingMessages.current.delete(event.status.id);
      setState((current) => {
        if (current.userId !== authenticatedUserId) {
          return current;
        }
        return {
          ...current,
          unreadCount: conversationId
            ? Math.max(0, current.unreadCount - 1)
            : current.unreadCount,
          items: conversationId
            ? current.items
                .map((item) =>
                  item.conversationId === conversationId
                    ? { ...item, unreadCount: Math.max(0, item.unreadCount - 1) }
                    : item,
                )
                .filter((item) => item.unreadCount > 0)
            : current.items,
          toasts: current.toasts.filter(
            (toast) => toast.id !== event.status.id,
          ),
        };
      });
      scheduleRefresh();
    };

    void refresh();

    return () => {
      controller.abort();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    account?.id,
    authenticatedFetch,
    authStatus,
    realtime?.manager,
    reloadKey,
  ]);

  const retry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);
  const dismissToast = useCallback((toastId: string) => {
    setState((current) => ({
      ...current,
      toasts: current.toasts.filter((toast) => toast.id !== toastId),
    }));
  }, []);
  const isCurrentUserState =
    authStatus === "authenticated" && state.userId === (account?.id ?? null);
  const items = useMemo(
    () => (isCurrentUserState ? state.items : []),
    [isCurrentUserState, state.items],
  );
  const unreadCount = isCurrentUserState ? state.unreadCount : 0;
  const toasts = isCurrentUserState ? state.toasts : [];
  const isLoading = isCurrentUserState
    ? state.isLoading
    : authStatus === "authenticated";
  const error = isCurrentUserState ? state.error : "";

  return {
    items,
    unreadCount,
    toasts,
    isLoading,
    error,
    retry,
    dismissToast,
  };
}
