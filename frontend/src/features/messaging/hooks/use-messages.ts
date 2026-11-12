"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMessage as deleteMessageRequest,
  editMessage as editMessageRequest,
  listMessages,
  MessageRequestError,
  sendMessage as sendMessageRequest,
} from "@/features/messaging/api";
import type { MessageRecord } from "@/features/messaging/types";
import type { AuthenticatedRequest } from "@/features/users/types";
import { useRealtimeConversation } from "@/features/messaging/hooks/use-realtime-conversation";
import { useMessagingRealtime } from "@/features/messaging/providers/messaging-provider";

const pageSize = 50;

type MessageState = {
  key: string;
  messages: MessageRecord[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingOlder: boolean;
  error: string;
  olderError: string;
  sendError: string;
  canSend: boolean;
};

type PendingMessageStatus = {
  id: string;
  status: MessageRecord["status"];
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

function compareMessages(first: MessageRecord, second: MessageRecord) {
  const timestampDifference =
    Date.parse(first.created_at) - Date.parse(second.created_at);
  return timestampDifference || first.id.localeCompare(second.id);
}

const statusRank = { sent: 0, delivered: 1, read: 2 } as const;

function mergeMessage(
  existing: MessageRecord,
  incoming: MessageRecord,
): MessageRecord {
  const newest = existing.deleted_at
    ? existing
    : incoming.deleted_at
      ? incoming
      : Date.parse(incoming.updated_at) >= Date.parse(existing.updated_at)
        ? incoming
        : existing;
  const highestStatus =
    statusRank[incoming.status] > statusRank[existing.status]
      ? incoming
      : existing;
  return {
    ...newest,
    status: highestStatus.status,
    sent_at: highestStatus.sent_at,
    delivered_at: existing.delivered_at ?? incoming.delivered_at,
    read_at: existing.read_at ?? incoming.read_at,
  };
}

function mergeMessages(
  existing: MessageRecord[],
  additions: MessageRecord[],
): MessageRecord[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of additions) {
    const current = byId.get(message.id);
    byId.set(message.id, current ? mergeMessage(current, message) : message);
  }
  return [...byId.values()].sort(compareMessages);
}

function applyPendingStatus(
  message: MessageRecord,
  pendingStatuses: Map<string, PendingMessageStatus>,
): MessageRecord {
  const status = pendingStatuses.get(message.id);
  if (!status) {
    return message;
  }
  pendingStatuses.delete(message.id);
  return mergeMessage(message, { ...message, ...status });
}

function mergePendingStatus(
  existing: PendingMessageStatus,
  incoming: PendingMessageStatus,
): PendingMessageStatus {
  const highest =
    statusRank[incoming.status] > statusRank[existing.status]
      ? incoming
      : existing;
  return {
    ...highest,
    delivered_at: existing.delivered_at ?? incoming.delivered_at,
    read_at: existing.read_at ?? incoming.read_at,
  };
}

function initialState(key: string): MessageState {
  return {
    key,
    messages: [],
    nextCursor: null,
    isLoading: true,
    isLoadingOlder: false,
    error: "",
    olderError: "",
    sendError: "",
    canSend: true,
  };
}

export function useMessages(
  authenticatedFetch: AuthenticatedRequest,
  conversationId: string,
  accountId: string,
  enabled = true,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const loadingOlder = useRef(false);
  const sending = useRef(false);
  const key = `${conversationId}:${reloadKey}`;
  const [state, setState] = useState<MessageState>(() => initialState(key));
  const pendingStatuses = useRef(new Map<string, PendingMessageStatus>());
  const realtime = useMessagingRealtime();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    const statusesForEffect = pendingStatuses.current;
    loadingOlder.current = false;
    sending.current = false;
    statusesForEffect.clear();

    void listMessages(
      authenticatedFetch,
      conversationId,
      { limit: pageSize },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          const recovered = page.items.map((message) =>
            applyPendingStatus(message, statusesForEffect),
          );
          setState((current) => {
            const base =
              current.key === key ? current : initialState(key);
            return {
              ...base,
              messages: mergeMessages(base.messages, recovered),
              nextCursor: page.next_cursor,
              isLoading: false,
              error: "",
            };
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...(current.key === key ? current : initialState(key)),
            isLoading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "We could not load message history. Please try again.",
          }));
        }
      });

    return () => {
      controller.abort();
      statusesForEffect.clear();
    };
  }, [authenticatedFetch, conversationId, enabled, key]);

  const handleRealtimeMessage = useCallback(
    (message: MessageRecord) => {
      const recovered = applyPendingStatus(message, pendingStatuses.current);
      setState((current) => {
        const base = current.key === key ? current : initialState(key);
        return { ...base, messages: mergeMessages(base.messages, [recovered]) };
      });
    },
    [key],
  );

  const handleRealtimeStatus = useCallback(
    (status: {
      id: string;
      status: MessageRecord["status"];
      sent_at: string;
      delivered_at: string | null;
      read_at: string | null;
    }) => {
      setState((current) => {
        const base = current.key === key ? current : initialState(key);
        const message = base.messages.find((item) => item.id === status.id);
        if (!message) {
          const previous = pendingStatuses.current.get(status.id);
          pendingStatuses.current.set(
            status.id,
            previous ? mergePendingStatus(previous, status) : status,
          );
          return base;
        }
        return {
          ...base,
          messages: mergeMessages(base.messages, [
            { ...message, ...status },
          ]),
        };
      });
    },
    [key],
  );

  const handleRealtimeError = useCallback(
    (message: string) => {
      setState((current) =>
        current.key === key
          ? { ...current, olderError: message }
          : current,
      );
    },
    [key],
  );

  const handleHistoryRecovered = useCallback(() => {
    setState((current) =>
      current.key === key ? { ...current, nextCursor: null } : current,
    );
  }, [key]);

  useRealtimeConversation({
    authenticatedFetch,
    conversationId,
    enabled,
    onMessage: handleRealtimeMessage,
    onStatus: handleRealtimeStatus,
    onError: handleRealtimeError,
    onHistoryRecovered: handleHistoryRecovered,
  });

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const loadOlder = useCallback(async () => {
    if (
      state.key !== key ||
      !state.nextCursor ||
      state.isLoadingOlder ||
      loadingOlder.current
    ) {
      return;
    }

    loadingOlder.current = true;
    setState((current) =>
      current.key === key
        ? { ...current, isLoadingOlder: true, olderError: "" }
        : current,
    );
    try {
      const page = await listMessages(
        authenticatedFetch,
        conversationId,
        { limit: pageSize, cursor: state.nextCursor },
      );
      setState((current) =>
        current.key === key
          ? {
              ...current,
              messages: mergeMessages(
                current.messages,
                page.items.map((message) =>
                  applyPendingStatus(message, pendingStatuses.current),
                ),
              ),
              nextCursor: page.next_cursor,
              isLoadingOlder: false,
            }
          : current,
      );
    } catch (cause) {
      setState((current) =>
        current.key === key
          ? {
              ...current,
              isLoadingOlder: false,
              olderError:
                cause instanceof Error
                  ? cause.message
                  : "We could not load older messages. Please try again.",
            }
          : current,
      );
    } finally {
      loadingOlder.current = false;
    }
  }, [
    authenticatedFetch,
    conversationId,
    key,
    state.isLoadingOlder,
    state.key,
    state.nextCursor,
  ]);

  const send = useCallback(
    async (content: string) => {
      if (sending.current || state.key !== key || !state.canSend) {
        return;
      }
      sending.current = true;
      setState((current) =>
        current.key === key ? { ...current, sendError: "" } : current,
      );
      try {
        const manager = realtime?.manager;
        const message =
          manager?.isConversationReady(conversationId)
            ? await manager.sendMessage(conversationId, content)
            : await sendMessageRequest(
                authenticatedFetch,
                conversationId,
                content,
              );
        setState((current) =>
          current.key === key
            ? {
                ...current,
                messages: mergeMessages(current.messages, [message]),
                sendError: "",
              }
            : current,
        );
      } catch (cause) {
        const isPermissionError =
          cause instanceof MessageRequestError && cause.status === 403;
        const message =
          cause instanceof MessageRequestError && cause.status === 0
            ? "Relay could not confirm whether this message was sent. Check the conversation before trying again."
            : cause instanceof Error
              ? cause.message
              : "We could not send your message. Please try again.";
        setState((current) =>
          current.key === key
            ? {
                ...current,
                canSend: isPermissionError ? false : current.canSend,
                sendError: message,
              }
            : current,
        );
        throw cause;
      } finally {
        sending.current = false;
      }
    },
    [
      authenticatedFetch,
      conversationId,
      key,
      realtime?.manager,
      state.canSend,
      state.key,
    ],
  );

  const edit = useCallback(
    async (messageId: string, content: string) => {
      const updated = await editMessageRequest(
        authenticatedFetch,
        messageId,
        content,
      );
      setState((current) =>
        current.key === key
          ? {
              ...current,
              messages: mergeMessages(current.messages, [updated]),
            }
          : current,
      );
    },
    [authenticatedFetch, key],
  );

  const remove = useCallback(
    async (messageId: string) => {
      const deleted = await deleteMessageRequest(authenticatedFetch, messageId);
      setState((current) =>
        current.key === key
          ? {
              ...current,
              messages: mergeMessages(current.messages, [deleted]),
            }
          : current,
      );
    },
    [authenticatedFetch, key],
  );

  const isCurrentState = state.key === key;
  const current = isCurrentState ? state : initialState(key);
  const deliveredAcks = useRef(new Set<string>());
  const readAcks = useRef(new Set<string>());
  const [canMarkRead, setCanMarkRead] = useState(false);

  useEffect(() => {
    if (realtime?.state !== "connected") {
      deliveredAcks.current.clear();
      readAcks.current.clear();
      setCanMarkRead(false);
    }
  }, [realtime?.state]);

  useEffect(() => {
    const updateReadVisibility = () => {
      setCanMarkRead(
        document.visibilityState === "visible" && document.hasFocus(),
      );
    };
    updateReadVisibility();
    window.addEventListener("focus", updateReadVisibility);
    window.addEventListener("blur", updateReadVisibility);
    document.addEventListener("visibilitychange", updateReadVisibility);
    return () => {
      window.removeEventListener("focus", updateReadVisibility);
      window.removeEventListener("blur", updateReadVisibility);
      document.removeEventListener("visibilitychange", updateReadVisibility);
    };
  }, []);

  useEffect(() => {
    const manager = realtime?.manager;
    if (!enabled || !manager?.isConversationReady(conversationId)) {
      return;
    }
    const incoming = current.messages.filter(
      (message) => message.sender_id !== accountId && message.deleted_at === null,
    );
    const toDeliver = incoming
      .filter(
        (message) =>
          message.status === "sent" && !deliveredAcks.current.has(message.id),
      )
      .map((message) => message.id);
    const toRead = canMarkRead
      ? incoming
          .filter(
            (message) =>
              message.status !== "read" && !readAcks.current.has(message.id),
          )
          .map((message) => message.id)
      : [];

    try {
      for (let index = 0; index < toDeliver.length; index += 100) {
        const messageIds = toDeliver.slice(index, index + 100);
        manager.sendEvent({
          type: "message.delivery_ack_batch",
          conversation_id: conversationId,
          message_ids: messageIds,
        });
        messageIds.forEach((id) => deliveredAcks.current.add(id));
      }
      for (let index = 0; index < toRead.length; index += 100) {
        const messageIds = toRead.slice(index, index + 100);
        manager.sendEvent({
          type: "message.read_ack",
          conversation_id: conversationId,
          message_ids: messageIds,
        });
        messageIds.forEach((id) => readAcks.current.add(id));
      }
    } catch (cause) {
      handleRealtimeError(
        cause instanceof Error
          ? cause.message
          : "Message status could not be synchronized.",
      );
    }
  }, [
    accountId,
    canMarkRead,
    conversationId,
    current.messages,
    enabled,
    handleRealtimeError,
    realtime?.manager,
    realtime?.state,
  ]);

  return {
    messages: current.messages,
    nextCursor: current.nextCursor,
    hasOlder: current.nextCursor !== null,
    isLoading: current.isLoading,
    isLoadingOlder: current.isLoadingOlder,
    error: current.error,
    olderError: current.olderError,
    sendError: current.sendError,
    canSend: current.canSend,
    connectionState: realtime?.state ?? "offline",
    reconnect: () => realtime?.manager.retry(),
    loadOlder,
    reload,
    send,
    edit,
    remove,
  };
}
