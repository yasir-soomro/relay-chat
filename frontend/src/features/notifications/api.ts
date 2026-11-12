import type { AuthenticatedRequest } from "@/features/users/types";

type UnreadCountResponse = {
  total_unread_count: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getUnreadCount(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<UnreadCountResponse> {
  let response: Response;
  try {
    response = await authenticatedFetch(
      "/api/v1/notifications/unread-count",
      { cache: "no-store", signal },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("Relay is temporarily unavailable. Please try again shortly.");
    }
    throw new Error(
      isRecord(body) && typeof body.detail === "string"
        ? body.detail
        : "Notifications could not be loaded.",
    );
  }
  if (
    !isRecord(body) ||
    typeof body.total_unread_count !== "number" ||
    !Number.isInteger(body.total_unread_count) ||
    body.total_unread_count < 0
  ) {
    throw new Error("Relay returned an unexpected unread count.");
  }
  return { total_unread_count: body.total_unread_count };
}
