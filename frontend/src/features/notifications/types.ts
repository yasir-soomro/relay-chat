export type ConversationNotification = {
  conversationId: string;
  unreadCount: number;
};

export type IncomingMessageToast = {
  id: string;
  conversationId: string;
};

export type NotificationState = {
  items: ConversationNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string;
  toasts: IncomingMessageToast[];
};
