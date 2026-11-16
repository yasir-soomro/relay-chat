"use client";

import { useCallback, useState } from "react";
import { RelayIcon } from "@/components/ui/relay-icon";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { UsernameSearch } from "@/features/users/components/username-search";
import { UserDiscoveryList } from "@/features/users/components/user-discovery-list";
import { useUserDiscovery } from "@/features/users/hooks/use-user-discovery";

export function UserDiscoveryPage() {
  const { authenticatedFetch } = useAuth();
  const [query, setQuery] = useState("");
  const discovery = useUserDiscovery(authenticatedFetch, query);
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return (
    <section
      aria-labelledby="discovery-heading"
      className="discovery-page w-full min-w-0 rounded-3xl p-4 sm:p-6 lg:p-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <p className="text-lg font-semibold tracking-tight text-ink">Discover</p>
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <RelayIcon className="size-4 text-primary" name="lock" />
          Your space to connect
        </p>
      </header>

      <div className="mt-8 motion-rise">
        <p className="text-sm font-semibold text-primary">Find your people</p>
        <h1
          className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-4xl"
          id="discovery-heading"
        >
          Discover members
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Find someone interesting. Say hello with a connection request.
        </p>
      </div>

      <div className="mt-7 max-w-3xl motion-rise-delayed">
        <UsernameSearch onSearch={handleSearch} />
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold leading-6 text-ink">
          People to discover
        </h2>
        {!discovery.isLoading &&
        !discovery.error &&
        discovery.users.length > 0 ? (
          <p className="text-sm text-muted">
            {discovery.users.length}{" "}
            {discovery.users.length === 1 ? "person" : "people"} shown
          </p>
        ) : null}
      </div>

      <UserDiscoveryList
        error={discovery.error}
        hasMore={discovery.hasMore}
        isLoading={discovery.isLoading}
        isLoadingMore={discovery.isLoadingMore}
        loadMoreError={discovery.loadMoreError}
        onLoadMore={() => void discovery.loadMore()}
        onRetry={discovery.retry}
        query={query}
        users={discovery.users}
      />
    </section>
  );
}
