"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { discoverUsers } from "@/features/users/api";
import type {
  AuthenticatedRequest,
  UserProfile,
} from "@/features/users/types";

const pageSize = 20;

type DiscoveryState = {
  query: string | null;
  reloadKey: number;
  users: UserProfile[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  loadMoreError: string;
};

export function useUserDiscovery(
  authenticatedFetch: AuthenticatedRequest,
  query: string,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DiscoveryState>({
    query: null,
    reloadKey: -1,
    users: [],
    nextCursor: null,
    isLoading: true,
    isLoadingMore: false,
    error: "",
    loadMoreError: "",
  });
  const loadMoreController = useRef<AbortController | null>(null);
  const loadMoreInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    loadMoreInProgress.current = false;

    void discoverUsers(
      authenticatedFetch,
      { q: query || undefined, limit: pageSize },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          setState({
            query,
            reloadKey,
            users: page.items,
            nextCursor: page.next_cursor,
            isLoading: false,
            isLoadingMore: false,
            error: "",
            loadMoreError: "",
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            query,
            reloadKey,
            users: [],
            nextCursor: null,
            isLoading: false,
            isLoadingMore: false,
            error:
              cause instanceof Error
                ? cause.message
                : "We could not load people to discover. Please try again.",
            loadMoreError: "",
          });
        }
      });

    return () => {
      controller.abort();
      loadMoreController.current?.abort();
      loadMoreController.current = null;
      loadMoreInProgress.current = false;
    };
  }, [authenticatedFetch, query, reloadKey]);

  const isCurrentState =
    state.query === query && state.reloadKey === reloadKey;
  const nextCursor = isCurrentState ? state.nextCursor : null;
  const isLoading = !isCurrentState || state.isLoading;
  const isLoadingMore = isCurrentState && state.isLoadingMore;

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || loadMoreInProgress.current) {
      return;
    }

    const controller = new AbortController();
    loadMoreController.current = controller;
    loadMoreInProgress.current = true;
    setState((currentState) =>
      currentState.query === query && currentState.reloadKey === reloadKey
        ? { ...currentState, isLoadingMore: true, loadMoreError: "" }
        : currentState,
    );
    try {
      const page = await discoverUsers(
        authenticatedFetch,
        { q: query || undefined, limit: pageSize, cursor: nextCursor },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setState((currentState) =>
          currentState.query === query &&
          currentState.reloadKey === reloadKey
            ? {
                ...currentState,
                users: [...currentState.users, ...page.items],
                nextCursor: page.next_cursor,
                isLoadingMore: false,
              }
            : currentState,
        );
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setState((currentState) =>
          currentState.query === query &&
          currentState.reloadKey === reloadKey
            ? {
                ...currentState,
                isLoadingMore: false,
                loadMoreError:
                  cause instanceof Error
                    ? cause.message
                    : "We could not load more people. Please try again.",
              }
            : currentState,
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        loadMoreInProgress.current = false;
        loadMoreController.current = null;
      }
    }
  }, [authenticatedFetch, isLoadingMore, nextCursor, query, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    users: isCurrentState ? state.users : [],
    nextCursor,
    hasMore: nextCursor !== null,
    isLoading,
    isLoadingMore,
    error: isCurrentState ? state.error : "",
    loadMoreError: isCurrentState ? state.loadMoreError : "",
    loadMore,
    retry,
  };
}
