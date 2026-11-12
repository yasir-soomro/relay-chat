export type MessageStatus = "sent" | "delivered" | "read";

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  deleted_at: string | null;
};

export type MessagePage = {
  items: MessageRecord[];
  next_cursor: string | null;
};
