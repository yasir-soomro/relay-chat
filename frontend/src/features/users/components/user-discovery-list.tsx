import { Button } from "@/components/ui/button";
import { DiscoveryUserCard } from "@/features/users/components/discovery-user-card";
import type { UserProfile } from "@/features/users/types";

type UserDiscoveryListProps = {
  users: UserProfile[];
  query: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string;
  loadMoreError: string;
  onRetry: () => void;
  onLoadMore: () => void;
};

export function UserDiscoveryList({
  users,
  query,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  loadMoreError,
  onRetry,
  onLoadMore,
}: UserDiscoveryListProps) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading people"
        className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
        role="status"
      >
        <span className="sr-only">Loading people…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            aria-hidden="true"
            className="min-h-56 animate-pulse rounded-card border border-line bg-surface"
            key={index}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 rounded-card border border-line bg-surface p-4 sm:p-6">
        <p className="break-words text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
        <Button
          className="discovery-state-action mt-3"
          onClick={onRetry}
          type="button"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mt-5 rounded-card border border-line bg-surface px-4 py-8 text-center sm:px-6 sm:py-10">
        <h2 className="text-lg font-semibold text-ink">
          {query ? "No matching members" : "No members to discover yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-muted">
          {query
            ? `No usernames begin with “${query}”. Try a different search.`
            : "When more people join Relay, their profiles will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 min-w-0">
      <ul
        aria-label="People"
        className="discovery-results grid min-w-0 auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
        key={query}
      >
        {users.map((profile) => (
          <li className="min-w-0" key={profile.id}>
            <DiscoveryUserCard profile={profile} />
          </li>
        ))}
      </ul>

      {loadMoreError ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-sm leading-6 text-danger" role="alert">
            {loadMoreError}
          </p>
          <Button
            className="discovery-state-action shrink-0"
            onClick={onLoadMore}
            type="button"
            variant="secondary"
          >
            Try loading more
          </Button>
        </div>
      ) : hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button
            className="discovery-state-action"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
            variant="secondary"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
