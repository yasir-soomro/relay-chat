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
        className="mt-8 grid gap-4 sm:grid-cols-2"
        role="status"
      >
        <span className="sr-only">Loading people…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            aria-hidden="true"
            className="h-40 animate-pulse rounded-card border border-line bg-surface"
            key={index}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm leading-6 text-[#8e3027]" role="alert">
          {error}
        </p>
        <Button className="mt-4" onClick={onRetry} type="button">
          Try again
        </Button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface px-6 py-10 text-center sm:px-8">
        <h2 className="text-lg font-semibold text-ink">
          {query ? "No matching members" : "No members to discover yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {query
            ? `No usernames begin with “${query}”. Try a different search.`
            : "When more people join Relay, their profiles will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ul
        aria-label="People"
        className="grid min-w-0 gap-4 sm:grid-cols-2"
      >
        {users.map((profile) => (
          <li className="min-w-0" key={profile.id}>
            <DiscoveryUserCard profile={profile} />
          </li>
        ))}
      </ul>

      {loadMoreError ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
            {loadMoreError}
          </p>
          <Button
            className="shrink-0"
            onClick={onLoadMore}
            type="button"
            variant="secondary"
          >
            Try loading more
          </Button>
        </div>
      ) : hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button
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
