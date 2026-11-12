import type { UserProfile } from "@/features/users/types";

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
  conversation: Conversation;
  participantId: string;
  participant: UserProfile | null;
};

export type ConversationContact = {
  userId: string;
  profile: UserProfile | null;
};
