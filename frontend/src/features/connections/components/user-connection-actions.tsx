"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useConnections } from "@/features/connections/providers/connections-provider";

type UserConnectionActionsProps = {
  userId: string;
  displayName: string;
  compact?: boolean;
  allowCancelRequest?: boolean;
  showStatusLabel?: boolean;
};

export function UserConnectionActions({
  userId,
  displayName,
  compact = false,
  allowCancelRequest = false,
  showStatusLabel = true,
}: UserConnectionActionsProps) {
  const { account } = useAuth();
  const connections = useConnections();
  const [actionError, setActionError] = useState("");
  const [confirming, setConfirming] = useState<"remove" | null>(null);
  const [isActing, setIsActing] = useState(false);
  const state = connections.stateFor(userId);

  if (account?.id === userId) {
    return null;
  }

  async function perform(action: () => Promise<void>) {
    setIsActing(true);
    setActionError("");
    try {
      await action();
      setConfirming(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "We could not update this connection. Please try again.",
      );
    } finally {
      setIsActing(false);
    }
  }

  if (connections.isLoading) {
    return (
      <p className="text-sm text-muted" role="status">
        Checking connection…
      </p>
    );
  }

  if (connections.error) {
    return (
      <div>
        <p className="text-sm text-danger" role="alert">
          Connection status is unavailable.
        </p>
        <button
          className="mt-1 text-sm font-semibold text-primary underline underline-offset-4"
          onClick={connections.reload}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  const buttonClass = compact
    ? "min-h-9 min-w-0 max-w-full whitespace-normal break-words rounded-lg px-3 py-2 text-xs leading-4"
    : "";

  return (
    <div
      className={`space-y-3 ${allowCancelRequest ? "discovery-connection-actions" : ""}`}
    >
      {actionError ? (
        <p className="break-words text-sm leading-6 text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {confirming ? (
        <div
          aria-label="Confirm removal"
          className="rounded-xl border border-line bg-soft p-4"
        >
          <p className="break-words text-sm leading-6 text-ink">
            {`Remove your connection with ${displayName}?`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className={buttonClass}
              disabled={isActing}
              onClick={() =>
                void perform(() =>
                  connections.remove(userId),
                )
              }
              type="button"
              variant="secondary"
            >
              {isActing ? "Working…" : "Confirm"}
            </Button>
            <Button
              className={buttonClass}
              disabled={isActing}
              onClick={() => setConfirming(null)}
              type="button"
              variant="quiet"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : state.status === "rejected" ? (
        <p className="text-sm font-medium text-muted">Request rejected</p>
      ) : state.status === "pending" && state.direction === "incoming" ? (
        <div className={showStatusLabel ? "space-y-2" : ""}>
          {showStatusLabel ? (
            <p className="text-sm font-medium text-muted">Pending</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              className={buttonClass}
              disabled={isActing}
              onClick={() =>
                void perform(() => connections.reject(state.connectionId))
              }
              type="button"
              variant="secondary"
            >
              Reject
            </Button>
            <Button
              className={buttonClass}
              disabled={isActing}
              onClick={() =>
                void perform(() => connections.accept(state.connectionId))
              }
              type="button"
            >
              Accept
            </Button>
          </div>
        </div>
      ) : state.status === "pending" ? (
        allowCancelRequest ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-muted">Pending</p>
            <Button
              className={buttonClass}
              disabled={isActing}
              onClick={() =>
                void perform(() => connections.cancelRequest(state.connectionId))
              }
              type="button"
              variant="secondary"
            >
              {isActing ? "Canceling…" : "Cancel Request"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-muted">Request pending</p>
          </div>
        )
      ) : state.status === "accepted" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-primary">
            Connected
          </p>
          <Button
            className={buttonClass}
            disabled={isActing}
            onClick={() => setConfirming("remove")}
            type="button"
            variant="quiet"
          >
            Remove connection
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            className={buttonClass}
            disabled={isActing}
            onClick={() => void perform(() => connections.request(userId))}
            type="button"
          >
            {isActing ? "Sending…" : "Connect"}
          </Button>
        </div>
      )}
    </div>
  );
}
