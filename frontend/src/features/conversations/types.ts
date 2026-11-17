import type { UserProfile } from "@/features/users/types";
import type { MessageRecord } from "@/features/messaging/types";

export type Conversation = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: string;
};

export type ConversationListItem = Conversation & {
  unread_count: number;
};

export type ConversationList = {
  items: ConversationListItem[];
};

export type ConversationEntry = {
  conversation: Conversation & { unread_count?: number };
  participantId: string;
  participant: UserProfile | null;
  latestMessage?: MessageRecord | null;
  messagePreviewError?: string;
};

export type ConversationContact = {
  userId: string;
  profile: UserProfile | null;
};
