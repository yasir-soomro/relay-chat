import { ConversationDetailPage } from "@/features/conversations/components/conversation-detail-page";

export default async function ConversationRoute({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationDetailPage conversationId={conversationId} />;
}
