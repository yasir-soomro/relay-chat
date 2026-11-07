"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AuthenticationRequestError,
  getCurrentAccount,
  login as requestLogin,
  logout as requestLogout,
  refreshAccessToken,
} from "@/features/auth/api";
import type {
  AuthStatus,
  LoginValues,
  TokenResponse,
  UserAccount,
} from "@/features/auth/types";

type AuthContextValue = {
  accessToken: string | null;
  account: UserAccount | null;
  status: AuthStatus;
  error: string | null;
  signIn: (values: LoginValues) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  authenticatedFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<TokenResponse | null> | null>(null);
  const bootstrapStarted = useRef(false);

  const updateAccessToken = useCallback((tokens: TokenResponse | null) => {
    accessTokenRef.current = tokens?.access_token ?? null;
    setAccessToken(tokens?.access_token ?? null);
    setExpiresAt(
      tokens ? Date.now() + tokens.expires_in * 1000 : null,
    );
  }, []);

  const refreshSessionToken = useCallback(() => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const operation = refreshAccessToken()
      .then((tokens) => {
        updateAccessToken(tokens);
        setError(null);
        return tokens;
      })
      .catch((cause: unknown) => {
        if (
          cause instanceof AuthenticationRequestError &&
          cause.status === 401
        ) {
          updateAccessToken(null);
          setAccount(null);
          setStatus("unauthenticated");
          setError(null);
          return null;
        }
        throw cause;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = operation;
    return operation;
  }, [updateAccessToken]);

  const restoreSession = useCallback(async () => {
    try {
      const tokens = await refreshSessionToken();
      if (!tokens) {
        return;
      }

      const currentAccount = await getCurrentAccount(tokens.access_token);
      setAccount(currentAccount);
      setStatus("authenticated");
      setError(null);
    } catch (cause) {
      updateAccessToken(null);
      setAccount(null);
      setStatus("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Relay could not restore your session. Please try again.",
      );
    }
  }, [refreshSessionToken, updateAccessToken]);

  const signIn = useCallback(
    async (values: LoginValues) => {
      await refreshPromiseRef.current?.catch(() => null);
      setError(null);
      const tokens = await requestLogin(values);
      const currentAccount = await getCurrentAccount(tokens.access_token);
      updateAccessToken(tokens);
      setAccount(currentAccount);
      setStatus("authenticated");
      setError(null);
    },
    [updateAccessToken],
  );

  const signOut = useCallback(async () => {
    let logoutError: unknown;
    try {
      let token = accessTokenRef.current;
      if (!token) {
        const refreshed = await refreshSessionToken();
        token = refreshed?.access_token ?? null;
      }

      if (token) {
        try {
          await requestLogout(token);
        } catch (cause) {
          if (
            cause instanceof AuthenticationRequestError &&
            cause.status === 401
          ) {
            const refreshed = await refreshSessionToken();
            if (!refreshed) {
              throw cause;
            }
            await requestLogout(refreshed.access_token);
          } else {
            throw cause;
          }
        }
      }
    } catch (cause) {
      logoutError = cause;
    } finally {
      updateAccessToken(null);
      setAccount(null);
      setStatus("unauthenticated");
    }

    if (logoutError) {
      const message =
        logoutError instanceof Error
          ? logoutError.message
          : "Relay could not end your session. Please try again.";
      setError(message);
      throw logoutError;
    }
    setError(null);
  }, [refreshSessionToken, updateAccessToken]);

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
        window.location.origin,
      );
      if (url.origin !== window.location.origin) {
        throw new TypeError("Authenticated requests must use the Relay origin.");
      }

      let token = accessTokenRef.current;
      if (!token) {
        const refreshed = await refreshSessionToken();
        token = refreshed?.access_token ?? null;
      }
      if (!token) {
        throw new AuthenticationRequestError(
          401,
          "Your session has expired. Please sign in again.",
        );
      }

      const requestInput = input instanceof Request ? input : url.href;
      const request = new Request(requestInput, {
        ...init,
        credentials: "same-origin",
      });
      const send = (access: string) => {
        const headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${access}`);
        return fetch(new Request(request, { headers }));
      };

      let response = await send(token);
      if (response.status !== 401) {
        return response;
      }

      const refreshed = await refreshSessionToken();
      if (!refreshed) {
        throw new AuthenticationRequestError(
          401,
          "Your session has expired. Please sign in again.",
        );
      }
      response = await send(refreshed.access_token);
      if (response.status === 401) {
        updateAccessToken(null);
        setAccount(null);
        setStatus("unauthenticated");
      }
      return response;
    },
    [refreshSessionToken, updateAccessToken],
  );

  useEffect(() => {
    if (bootstrapStarted.current) {
      return;
    }
    bootstrapStarted.current = true;
    void Promise.resolve().then(restoreSession);
  }, [restoreSession]);

  useEffect(() => {
    if (status !== "authenticated" || expiresAt === null) {
      return;
    }

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const retryRefresh = () => {
      if (stopped) {
        return;
      }
      void refreshSessionToken().catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Relay could not refresh your session.",
        );
        retryTimer = setTimeout(retryRefresh, 30_000);
      });
    };
    const refreshDelay = Math.max(expiresAt - Date.now() - 60_000, 0);
    const timer = setTimeout(() => {
      void refreshSessionToken().catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Relay could not refresh your session.",
        );
        retryTimer = setTimeout(retryRefresh, 30_000);
      });
    }, refreshDelay);

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [expiresAt, refreshSessionToken, status]);

  const value = useMemo(
    () => ({
      accessToken,
      account,
      status,
      error,
      signIn,
      signOut,
      restoreSession,
      authenticatedFetch,
    }),
    [
      accessToken,
      account,
      status,
      error,
      signIn,
      signOut,
      restoreSession,
      authenticatedFetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
