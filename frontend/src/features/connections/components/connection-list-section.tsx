"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import { getPublicProfile, UserRequestError } from "@/features/users/api";
import type {
  ConnectionRecord,
  ConnectionListEntry,
} from "@/features/connections/types";
import type { UserProfile } from "@/features/users/types";

type ConnectionListSectionProps = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  connections: ConnectionRecord[];
  currentUserId: string;
};

function otherUserId(connection: ConnectionRecord, currentUserId: string) {
  return connection.requester_id === currentUserId
    ? connection.recipient_id
    : connection.requester_id;
}

export function ConnectionListSection({
  title,
  emptyTitle,
  emptyDescription,
  connections,
  currentUserId,
}: ConnectionListSectionProps) {
  const { authenticatedFetch } = useAuth();
  const [loaded, setLoaded] = useState<{
    key: string;
    entries: ConnectionListEntry[];
  }>({ key: "", entries: [] });
  const [reloadKey, setReloadKey] = useState(0);
  const listKey = `${currentUserId}:${connections.map((item) => item.id).join(",")}:${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    if (connections.length === 0) {
      return () => controller.abort();
    }

    void Promise.all(
      connections.map(async (connection) => {
        const userId = otherUserId(connection, currentUserId);
        try {
          const profile: UserProfile = await getPublicProfile(
            authenticatedFetch,
            userId,
            controller.signal,
          );
          return {
            connection,
            userId,
            profile,
            profileError: "",
          } satisfies ConnectionListEntry;
        } catch (cause) {
          if (controller.signal.aborted) {
            throw cause;
          }
          return {
            connection,
            userId,
            profile: null,
            profileError:
              cause instanceof UserRequestError && cause.status === 404
                ? "This profile is unavailable."
                : "We could not load this profile.",
          } satisfies ConnectionListEntry;
        }
      }),
    )
      .then((loadedEntries) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: listKey, entries: loadedEntries });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({
            key: listKey,
            entries: connections.map((connection) => ({
              connection,
              userId: otherUserId(connection, currentUserId),
              profile: null,
              profileError: "We could not load this profile.",
            })),
          });
        }
      });

    return () => controller.abort();
  }, [authenticatedFetch, connections, currentUserId, listKey]);

  const isLoading = connections.length > 0 && loaded.key !== listKey;
  const entries = loaded.key === listKey ? loaded.entries : [];

  return (
    <section aria-labelledby="connections-list-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-xl font-semibold tracking-tight text-ink"
            id="connections-list-heading"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {connections.length}{" "}
            {connections.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="mt-5 rounded-card border border-line bg-surface px-6 py-10 text-center">
          <h3 className="font-semibold text-ink">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {emptyDescription}
          </p>
        </div>
      ) : isLoading ? (
        <div aria-label={`Loading ${title.toLowerCase()}`} className="mt-5 grid gap-3" role="status">
          <span className="sr-only">Loading {title.toLowerCase()}…</span>
          {Array.from({ length: 2 }, (_, index) => (
            <div
              aria-hidden="true"
              className="h-28 animate-pulse rounded-card border border-line bg-surface"
              key={index}
            />
          ))}
        </div>
      ) : (
        <ul className="mt-5 grid gap-3">
          {entries.map(({ connection, userId, profile, profileError }) => (
            <li
              className={`${surfaceCardClassName} flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}
              key={connection.id}
            >
              <div className="flex min-w-0 items-center gap-4">
                {profile ? (
                  <>
                    <ProfileAvatar
                      displayName={profile.display_name}
                      username={profile.username}
                    />
                    <div className="min-w-0">
                      <Link
                        className="break-words font-semibold text-ink hover:text-moss focus-visible:outline-moss"
                        href={`/app/users/${encodeURIComponent(profile.id)}`}
                      >
                        {profile.display_name}
                      </Link>
                      <p className="mt-0.5 break-all text-sm text-moss">
                        @{profile.username}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Relay member</p>
                    <p className="mt-1 text-sm text-muted" role="status">
                      {profileError}
                    </p>
                    <Button
                      className="mt-2 min-h-9 px-3"
                      onClick={() => setReloadKey((key) => key + 1)}
                      type="button"
                      variant="quiet"
                    >
                      Retry profile
                    </Button>
                  </div>
                )}
              </div>
              <UserConnectionActions
                compact
                displayName={profile?.display_name ?? "this member"}
                userId={userId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
