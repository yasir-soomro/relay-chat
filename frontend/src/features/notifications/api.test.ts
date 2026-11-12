import { describe, expect, it, vi } from "vitest";
import { getUnreadCount } from "@/features/notifications/api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("notifications API", () => {
  it("requests and validates the authenticated unread count", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ total_unread_count: 5 }));

    await expect(getUnreadCount(authenticatedFetch)).resolves.toEqual({
      total_unread_count: 5,
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/api/v1/notifications/unread-count",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("rejects invalid counts instead of applying a fallback", async () => {
    const authenticatedFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ total_unread_count: -1 }));

    await expect(getUnreadCount(authenticatedFetch)).rejects.toThrow(
      "Relay returned an unexpected unread count.",
    );
  });
});
