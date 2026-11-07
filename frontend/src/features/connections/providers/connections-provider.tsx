"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  acceptConnectionRequest,
  blockUser,
  ConnectionRequestError,
  listAcceptedConnections,
  listIncomingRequests,
  listOutgoingRequests,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
  unblockUser,
} from "@/features/connections/api";
import type {
  ConnectionPage,
  ConnectionRecord,
  ConnectionViewState,
} from "@/features/connections/types";

type ConnectionLists = {
  incoming: ConnectionRecord[];
  outgoing: ConnectionRecord[];
  accepted: ConnectionRecord[];
};

type ConnectionsContextValue = ConnectionLists & {
  isLoading: boolean;
  error: string;
  feedback: string;
  reload: () => void;
  stateFor: (userId: string) => ConnectionViewState;
  request: (userId: string) => Promise<void>;
  accept: (connectionId: string) => Promise<void>;
  reject: (connectionId: string) => Promise<void>;
  remove: (userId: string) => Promise<void>;
  block: (userId: string, displayName?: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
};

const ConnectionsContext = createContext<ConnectionsContextValue | null>(null);

function unavailableLists(): ConnectionLists {
  return { incoming: [], outgoing: [], accepted: [] };
}

function removeConnectionFromPage(
  page: ConnectionPage,
  connectionId: string,
): ConnectionRecord[] {
  return page.items.filter((item) => item.id !== connectionId);
}

function upsertConnection(
  items: ConnectionRecord[],
  connection: ConnectionRecord,
): ConnectionRecord[] {
  return [...items.filter((item) => item.id !== connection.id), connection];
}

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const { authenticatedFetch } = useAuth();
  const [lists, setLists] = useState<ConnectionLists>(unavailableLists);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(() => new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(() => new Set());
  const [lastBlocked, setLastBlocked] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listIncomingRequests(authenticatedFetch, controller.signal),
      listOutgoingRequests(authenticatedFetch, controller.signal),
      listAcceptedConnections(authenticatedFetch, controller.signal),
    ])
      .then(([incoming, outgoing, accepted]) => {
        if (!controller.signal.aborted) {
          setLists({
            incoming: incoming.items,
            outgoing: outgoing.items,
            accepted: accepted.items,
          });
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "We could not load your connections. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [authenticatedFetch, reloadKey]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  }, []);

  const stateFor = useCallback(
    (userId: string): ConnectionViewState => {
      if (blockedIds.has(userId)) {
        return { status: "blocked" };
      }
      if (rejectedIds.has(userId)) {
        return { status: "rejected" };
      }
      const incoming = lists.incoming.find(
        (connection) => connection.requester_id === userId,
      );
      if (incoming) {
        return {
          status: "pending",
          direction: "incoming",
          connectionId: incoming.id,
        };
      }
      const outgoing = lists.outgoing.find(
        (connection) => connection.recipient_id === userId,
      );
      if (outgoing) {
        return {
          status: "pending",
          direction: "outgoing",
          connectionId: outgoing.id,
        };
      }
      const accepted = lists.accepted.find(
        (connection) =>
          connection.requester_id === userId ||
          connection.recipient_id === userId,
      );
      if (accepted) {
        return { status: "accepted", connectionId: accepted.id };
      }
      return { status: "none" };
    },
    [blockedIds, lists, rejectedIds],
  );

  const request = useCallback(
    async (userId: string) => {
      const connection = await sendConnectionRequest(authenticatedFetch, userId);
      if (connection.status !== "pending") {
        throw new ConnectionRequestError(
          502,
          "Relay returned an unexpected connection state.",
        );
      }
      setLists((current) => ({
        ...current,
        outgoing: upsertConnection(current.outgoing, connection),
      }));
      setBlockedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      setRejectedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      setFeedback("Connection request sent.");
    },
    [authenticatedFetch],
  );

  const accept = useCallback(
    async (connectionId: string) => {
      const connection = await acceptConnectionRequest(
        authenticatedFetch,
        connectionId,
      );
      if (connection.status !== "accepted") {
        throw new ConnectionRequestError(
          502,
          "Relay did not confirm that the connection was accepted.",
        );
      }
      setLists((current) => ({
        incoming: removeConnectionFromPage(
          { items: current.incoming },
          connectionId,
        ),
        outgoing: removeConnectionFromPage(
          { items: current.outgoing },
          connectionId,
        ),
        accepted: upsertConnection(current.accepted, connection),
      }));
      setFeedback("Connection request accepted.");
    },
    [authenticatedFetch],
  );

  const reject = useCallback(
    async (connectionId: string) => {
      const connection = await rejectConnectionRequest(
        authenticatedFetch,
        connectionId,
      );
      if (connection.status !== "rejected") {
        throw new ConnectionRequestError(
          502,
          "Relay did not confirm that the request was rejected.",
        );
      }
      const otherUserId = connection.requester_id;
      setLists((current) => ({
        ...current,
        incoming: removeConnectionFromPage(
          { items: current.incoming },
          connectionId,
        ),
      }));
      setRejectedIds((current) => new Set(current).add(otherUserId));
      setFeedback("Connection request declined.");
    },
    [authenticatedFetch],
  );

  const remove = useCallback(
    async (userId: string) => {
      const connection = await removeConnection(authenticatedFetch, userId);
      if (connection.status !== "removed") {
        throw new ConnectionRequestError(
          502,
          "Relay did not confirm that the connection was removed.",
        );
      }
      setLists((current) => ({
        ...current,
        accepted: removeConnectionFromPage(
          { items: current.accepted },
          connection.id,
        ),
      }));
      setFeedback("Connection removed.");
    },
    [authenticatedFetch],
  );

  const block = useCallback(
    async (userId: string, displayName = "this member") => {
      const block = await blockUser(authenticatedFetch, userId);
      if (block.blocked_user_id !== userId) {
        throw new ConnectionRequestError(
          502,
          "Relay returned an unexpected block response.",
        );
      }
      setLists((current) => ({
        incoming: current.incoming.filter(
          (item) =>
            item.requester_id !== userId && item.recipient_id !== userId,
        ),
        outgoing: current.outgoing.filter(
          (item) =>
            item.requester_id !== userId && item.recipient_id !== userId,
        ),
        accepted: current.accepted.filter(
          (item) =>
            item.requester_id !== userId && item.recipient_id !== userId,
        ),
      }));
      setBlockedIds((current) => new Set(current).add(userId));
      setRejectedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      setLastBlocked({ userId, displayName });
      setFeedbackIsError(false);
      setFeedback("Member blocked. You can unblock them here.");
    },
    [authenticatedFetch],
  );

  const unblock = useCallback(
    async (userId: string) => {
      try {
        await unblockUser(authenticatedFetch, userId);
      } catch (cause) {
        if (
          cause instanceof ConnectionRequestError &&
          cause.status === 404
        ) {
          setBlockedIds((current) => {
            const next = new Set(current);
            next.delete(userId);
            return next;
          });
          setLastBlocked((current) =>
            current?.userId === userId ? null : current,
          );
        }
        throw cause;
      }
      setBlockedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      setLastBlocked((current) =>
        current?.userId === userId ? null : current,
      );
      setFeedbackIsError(false);
      setFeedback("Member unblocked.");
    },
    [authenticatedFetch],
  );

  const value = useMemo(
    () => ({
      ...lists,
      isLoading,
      error,
      feedback,
      reload,
      stateFor,
      request,
      accept,
      reject,
      remove,
      block,
      unblock,
    }),
    [
      accept,
      block,
      error,
      feedback,
      isLoading,
      lists,
      reload,
      reject,
      remove,
      request,
      stateFor,
      unblock,
    ],
  );

  async function undoLastBlock() {
    if (!lastBlocked) {
      return;
    }
    try {
      await unblock(lastBlocked.userId);
    } catch (cause) {
      setFeedbackIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "We could not unblock this member. Please try again.",
      );
    }
  }

  return (
    <ConnectionsContext.Provider value={value}>
      {feedback ? (
        <div
          aria-live="polite"
          className={`fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border px-4 py-3 text-sm font-medium shadow-card sm:left-auto sm:right-6 ${
            feedbackIsError
              ? "border-[#b5463a] bg-surface text-[#8e3027]"
              : "border-line bg-surface text-ink"
          }`}
          role={feedbackIsError ? "alert" : "status"}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>{feedback}</span>
              {lastBlocked ? (
                <button
                  className="min-h-8 font-semibold text-moss underline underline-offset-4"
                  disabled={isLoading}
                  onClick={() => void undoLastBlock()}
                  type="button"
                >
                  Unblock {lastBlocked.displayName}
                </button>
              ) : null}
            </div>
            {!lastBlocked ? (
              <button
                aria-label="Dismiss connection message"
                className="min-h-6 min-w-6 text-muted hover:text-ink"
                onClick={() => setFeedback("")}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error("useConnections must be used within ConnectionsProvider.");
  }
  return context;
}
