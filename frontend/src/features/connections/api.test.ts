import { describe, expect, it, vi } from "vitest";
import {
  blockUser,
  ConnectionRequestError,
  listAcceptedConnections,
  rejectConnectionRequest,
  sendConnectionRequest,
  unblockUser,
} from "@/features/connections/api";

const connection = {
  id: "connection-id",
  requester_id: "requester-id",
  recipient_id: "recipient-id",
  status: "pending",
  requested_at: "2026-11-08T00:00:00Z",
  responded_at: null,
  rejected_at: null,
  removed_at: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("connection API", () => {
  it("loads the accepted connection list using the existing endpoint", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [connection] }));

    await expect(listAcceptedConnections(authenticatedFetch)).resolves.toEqual({
      items: [connection],
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/connections",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("sends a request with only recipient_id and uses the returned record", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(connection, 201));

    await expect(
      sendConnectionRequest(authenticatedFetch, "recipient-id"),
    ).resolves.toEqual(connection);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/connections/requests",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ recipient_id: "recipient-id" }),
      }),
    );
  });

  it("handles backend rejection responses and connection cooldown errors", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...connection, status: "rejected" }));

    await expect(
      rejectConnectionRequest(authenticatedFetch, connection.id),
    ).resolves.toMatchObject({ status: "rejected" });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      `/connections/requests/${connection.id}/reject`,
      expect.objectContaining({ method: "POST" }),
    );

    const retryAt = "2026-11-15T00:00:00Z";
    authenticatedFetch.mockResolvedValueOnce(
      jsonResponse({
        detail: {
          code: "connection_request_cooldown_active",
          retry_at: retryAt,
        },
      }, 409),
    );
    await expect(
      sendConnectionRequest(authenticatedFetch, "recipient-id"),
    ).rejects.toMatchObject({
      name: "ConnectionRequestError",
      status: 409,
      message: `You can send another request after ${new Date(retryAt).toLocaleString()}.`,
    } satisfies Partial<ConnectionRequestError>);
  });

  it("uses the established block and unblock routes", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          blocked_user_id: "recipient-id",
          created_at: "2026-11-08T00:00:00Z",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await blockUser(authenticatedFetch, "recipient-id");
    await unblockUser(authenticatedFetch, "recipient-id");

    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      1,
      "/connections/recipient-id/block",
      expect.objectContaining({ method: "POST" }),
    );
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      2,
      "/connections/recipient-id/block",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
