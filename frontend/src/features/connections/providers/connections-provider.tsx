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
  cancelConnectionRequest,
  ConnectionRequestError,
  listAcceptedConnections,
  listIncomingRequests,
  listOutgoingRequests,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
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
  cancelRequest: (connectionId: string) => Promise<void>;
  accept: (connectionId: string) => Promise<void>;
  reject: (connectionId: string) => Promise<void>;
  remove: (userId: string) => Promise<void>;
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
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(() => new Set());

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
    [lists, rejectedIds],
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
      setRejectedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      setFeedback("Connection request sent.");
    },
    [authenticatedFetch],
  );

  const cancelRequest = useCallback(
    async (connectionId: string) => {
      const connection = await cancelConnectionRequest(
        authenticatedFetch,
        connectionId,
      );
      if (connection.id !== connectionId || connection.status !== "removed") {
        throw new ConnectionRequestError(
          502,
          "Relay did not confirm that the request was canceled.",
        );
      }
      setLists((current) => ({
        ...current,
        outgoing: removeConnectionFromPage(
          { items: current.outgoing },
          connectionId,
        ),
      }));
      setFeedback("Connection request canceled.");
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

  const value = useMemo(
    () => ({
      ...lists,
      isLoading,
      error,
      feedback,
      reload,
      stateFor,
      request,
      cancelRequest,
      accept,
      reject,
      remove,
    }),
    [
      accept,
      cancelRequest,
      error,
      feedback,
      isLoading,
      lists,
      reload,
      reject,
      remove,
      request,
      stateFor,
    ],
  );

  return (
    <ConnectionsContext.Provider value={value}>
      {feedback ? (
        <div
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-card sm:left-auto sm:right-6"
          role="status"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>{feedback}</span>
            </div>
            <button
              aria-label="Dismiss connection message"
              className="min-h-6 min-w-6 text-muted hover:text-ink"
              onClick={() => setFeedback("")}
              type="button"
            >
              ×
            </button>
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
