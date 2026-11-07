"use client";

import { useCallback, useState } from "react";
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
    <section aria-labelledby="discovery-heading" className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-moss">Find your people</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="discovery-heading"
      >
        Discover members
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
        Find Relay members by username and get to know them through their
        profiles.
      </p>

      <div className="mt-7">
        <UsernameSearch onSearch={handleSearch} />
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
