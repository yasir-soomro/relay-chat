"use client";

import { createContext, useContext, type ReactNode } from "react";
import { NotificationToasts } from "@/features/notifications/components/notification-toasts";
import { useNotificationState } from "@/features/notifications/hooks/use-notification-state";
import type { NotificationState } from "@/features/notifications/types";

export type NotificationContextValue = NotificationState & {
  retry: () => void;
  dismissToast: (toastId: string) => void;
};

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const state = useNotificationState();

  return (
    <NotificationContext.Provider value={state}>
      {children}
      <NotificationToasts
        onDismiss={state.dismissToast}
        toasts={state.toasts}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider.",
    );
  }
  return context;
}

export function useOptionalNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  return (
    context ?? {
      items: [],
      unreadCount: 0,
      isLoading: false,
      error: "",
      toasts: [],
      retry: () => undefined,
      dismissToast: () => undefined,
    }
  );
}
