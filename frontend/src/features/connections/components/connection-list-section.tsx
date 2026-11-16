"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  countLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  connections: ConnectionRecord[];
  currentUserId: string;
  allowCancelRequest: boolean;
};

const connectionDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function otherUserId(connection: ConnectionRecord, currentUserId: string) {
  return connection.requester_id === currentUserId
    ? connection.recipient_id
    : connection.requester_id;
}

function formatConnectionDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return connectionDateFormatter.format(date);
}

export function ConnectionListSection({
  title,
  countLabel,
  emptyTitle,
  emptyDescription,
  connections,
  currentUserId,
  allowCancelRequest,
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
    <section aria-labelledby="connections-list-heading" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-muted"
          id="connections-list-heading"
        >
          {title}
        </h2>
        <p className="text-xs text-muted">
          {connections.length}{" "}
          {connections.length === 1 ? countLabel : `${countLabel}s`}
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface px-5 py-9 text-center sm:px-7">
          <h3 className="font-semibold text-ink">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {emptyDescription}
          </p>
        </div>
      ) : isLoading ? (
        <div
          aria-label={`Loading ${title.toLowerCase()}`}
          className="mt-4 grid gap-3"
          role="status"
        >
          <span className="sr-only">Loading {title.toLowerCase()}…</span>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              aria-hidden="true"
              className="h-24 animate-pulse rounded-xl border border-line bg-surface motion-reduce:animate-none"
              key={index}
            />
          ))}
        </div>
      ) : (
        <ul className="connections-list mt-4 grid min-w-0 gap-3">
          {entries.map(({ connection, userId, profile, profileError }) => {
            const activityTimestamp =
              connection.status === "accepted"
                ? connection.responded_at
                : connection.requested_at;
            const activityDate = formatConnectionDate(activityTimestamp);

            return (
              <li
                className="connections-card grid min-w-0 gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                key={connection.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {profile ? (
                    <>
                      <ProfileAvatar
                        displayName={profile.display_name}
                        size="small"
                        username={profile.username}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <Link
                            className="break-words text-sm font-semibold text-ink hover:text-primary focus-visible:outline-focus"
                            href={`/app/users/${encodeURIComponent(profile.id)}`}
                          >
                            {profile.display_name}
                          </Link>
                          {activityDate ? (
                            <time
                              aria-label={
                                connection.status === "accepted"
                                  ? `Connected ${activityDate}`
                                  : `Requested ${activityDate}`
                              }
                              className="text-[0.7rem] text-muted"
                              dateTime={activityTimestamp ?? undefined}
                            >
                              {activityDate}
                            </time>
                          ) : null}
                        </div>
                        <p className="mt-0.5 break-all text-xs text-primary">
                          @{profile.username}
                        </p>
                        {profile.bio?.trim() ? (
                          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted">
                            {profile.bio}
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <ProfileAvatar
                        displayName="Relay member"
                        size="small"
                        username="member"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">Relay member</p>
                        <p className="mt-1 text-xs text-muted" role="status">
                          {profileError}
                        </p>
                        <Button
                          className="mt-2 min-h-9 px-3 text-xs"
                          onClick={() => setReloadKey((key) => key + 1)}
                          type="button"
                          variant="quiet"
                        >
                          Retry profile
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="connections-card-actions flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
                  {profile ? (
                    <Link
                      className="min-h-9 shrink-0 self-center text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-focus"
                      href={`/app/users/${encodeURIComponent(profile.id)}`}
                    >
                      View profile
                    </Link>
                  ) : null}
                  <UserConnectionActions
                    allowCancelRequest={allowCancelRequest}
                    compact
                    displayName={profile?.display_name ?? "this member"}
                    userId={userId}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
