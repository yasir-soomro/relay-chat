import type { AuthenticatedRequest } from "@/features/users/types";
import type {
  BlockResponse,
  ConnectionPage,
  ConnectionRecord,
} from "@/features/connections/types";

export class ConnectionRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ConnectionRequestError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConnectionStatus(value: unknown): value is ConnectionRecord["status"] {
  return (
    value === "pending" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "removed"
  );
}

function parseConnection(value: unknown): ConnectionRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.requester_id !== "string" ||
    typeof value.recipient_id !== "string" ||
    !isConnectionStatus(value.status) ||
    typeof value.requested_at !== "string" ||
    (typeof value.responded_at !== "string" && value.responded_at !== null) ||
    (typeof value.rejected_at !== "string" && value.rejected_at !== null) ||
    (typeof value.removed_at !== "string" && value.removed_at !== null)
  ) {
    throw new ConnectionRequestError(
      502,
      "Relay returned an unexpected connection response. Please try again.",
    );
  }

  return {
    id: value.id,
    requester_id: value.requester_id,
    recipient_id: value.recipient_id,
    status: value.status,
    requested_at: value.requested_at,
    responded_at: value.responded_at,
    rejected_at: value.rejected_at,
    removed_at: value.removed_at,
  };
}

function parseConnectionPage(value: unknown): ConnectionPage {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ConnectionRequestError(
      502,
      "Relay returned an unexpected connection list. Please try again.",
    );
  }
  return { items: value.items.map(parseConnection) };
}

function parseBlock(value: unknown): BlockResponse {
  if (
    !isRecord(value) ||
    typeof value.blocked_user_id !== "string" ||
    typeof value.created_at !== "string"
  ) {
    throw new ConnectionRequestError(
      502,
      "Relay returned an unexpected block response. Please try again.",
    );
  }
  return { blocked_user_id: value.blocked_user_id, created_at: value.created_at };
}

async function request(
  authenticatedFetch: AuthenticatedRequest,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, {
      cache: "no-store",
      ...init,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new ConnectionRequestError(
      0,
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      isRecord(body) && typeof body.detail === "string" ? body.detail : "";
    if (response.status === 404) {
      throw new ConnectionRequestError(
        response.status,
        init.method === "DELETE" && path.endsWith("/block")
          ? "This unblock target is no longer available."
          : "This member or connection is no longer available.",
      );
    }
    if (response.status === 409) {
      if (detail === "Connection request cooldown has not elapsed") {
        throw new ConnectionRequestError(
          response.status,
          "You need to wait before sending another request to this member.",
        );
      }
      throw new ConnectionRequestError(
        response.status,
        "This connection is already pending or its current state does not allow that action.",
      );
    }
    if (response.status === 503) {
      throw new ConnectionRequestError(
        response.status,
        detail === "Connection request cooldown is not configured"
          ? "Connection requests are temporarily unavailable."
          : "Relay is temporarily unavailable. Please try again shortly.",
      );
    }
    if (response.status === 403) {
      throw new ConnectionRequestError(
        response.status,
        "You are not allowed to perform this connection action.",
      );
    }
    if (response.status >= 500) {
      throw new ConnectionRequestError(
        response.status,
        "Relay is temporarily unavailable. Please try again shortly.",
      );
    }
    throw new ConnectionRequestError(
      response.status,
      "We could not complete this connection action. Please try again.",
    );
  }
  return body;
}

export async function listIncomingRequests(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<ConnectionPage> {
  return parseConnectionPage(
    await request(authenticatedFetch, "/connections/requests/incoming", {
      signal,
    }),
  );
}

export async function listOutgoingRequests(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<ConnectionPage> {
  return parseConnectionPage(
    await request(authenticatedFetch, "/connections/requests/outgoing", {
      signal,
    }),
  );
}

export async function listAcceptedConnections(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<ConnectionPage> {
  return parseConnectionPage(
    await request(authenticatedFetch, "/connections", { signal }),
  );
}

export async function sendConnectionRequest(
  authenticatedFetch: AuthenticatedRequest,
  recipientId: string,
): Promise<ConnectionRecord> {
  return parseConnection(
    await request(authenticatedFetch, "/connections/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: recipientId }),
    }),
  );
}

export async function acceptConnectionRequest(
  authenticatedFetch: AuthenticatedRequest,
  connectionId: string,
): Promise<ConnectionRecord> {
  return parseConnection(
    await request(
      authenticatedFetch,
      `/connections/requests/${encodeURIComponent(connectionId)}/accept`,
      { method: "POST" },
    ),
  );
}

export async function rejectConnectionRequest(
  authenticatedFetch: AuthenticatedRequest,
  connectionId: string,
): Promise<ConnectionRecord> {
  return parseConnection(
    await request(
      authenticatedFetch,
      `/connections/requests/${encodeURIComponent(connectionId)}/reject`,
      { method: "POST" },
    ),
  );
}

export async function removeConnection(
  authenticatedFetch: AuthenticatedRequest,
  otherUserId: string,
): Promise<ConnectionRecord> {
  return parseConnection(
    await request(
      authenticatedFetch,
      `/connections/${encodeURIComponent(otherUserId)}`,
      { method: "DELETE" },
    ),
  );
}

export async function blockUser(
  authenticatedFetch: AuthenticatedRequest,
  otherUserId: string,
): Promise<BlockResponse> {
  return parseBlock(
    await request(
      authenticatedFetch,
      `/connections/${encodeURIComponent(otherUserId)}/block`,
      { method: "POST" },
    ),
  );
}

export async function unblockUser(
  authenticatedFetch: AuthenticatedRequest,
  otherUserId: string,
): Promise<void> {
  await request(
    authenticatedFetch,
    `/connections/${encodeURIComponent(otherUserId)}/block`,
    { method: "DELETE" },
  );
}
