"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  WebSocketConnectionManager,
  type ConnectionState,
} from "@/features/messaging/websocket/connection-manager";

export type MessagingRealtimeValue = {
  manager: WebSocketConnectionManager;
  state: ConnectionState;
};

export const MessagingRealtimeContext =
  createContext<MessagingRealtimeValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { accessToken, account, getFreshAccessToken } = useAuth();
  const [manager] = useState(() => new WebSocketConnectionManager());
  const [state, setState] = useState<ConnectionState>("offline");

  useEffect(() => manager.listen(setState), [manager]);

  useEffect(() => {
    manager.setAuthentication(
      accessToken,
      getFreshAccessToken,
      account?.id ?? null,
    );
  }, [accessToken, account?.id, getFreshAccessToken, manager]);

  const value = useMemo(() => ({ manager, state }), [manager, state]);
  return (
    <MessagingRealtimeContext.Provider value={value}>
      {children}
    </MessagingRealtimeContext.Provider>
  );
}

export function useMessagingRealtime(): MessagingRealtimeValue | null {
  return useContext(MessagingRealtimeContext);
}
