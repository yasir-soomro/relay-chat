import { ConversationsPage } from "@/features/conversations/components/conversations-page";

export default async function ConversationRoute({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationsPage selectedConversationId={conversationId} />;
}
