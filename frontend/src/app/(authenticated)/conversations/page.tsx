import { ConversationsPage } from "@/features/conversations/components/conversations-page";

// This route is gated by client-side session restoration in the authenticated
// layout, so it is intentionally absent from the initial server render.
export const instant = false;

export default function ConversationsRoute() {
  return <ConversationsPage />;
}
