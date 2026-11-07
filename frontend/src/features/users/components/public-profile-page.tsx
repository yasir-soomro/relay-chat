"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ProfileCard } from "@/features/users/components/profile-card";
import { getPublicProfile } from "@/features/users/api";
import type { UserProfile } from "@/features/users/types";

type PublicProfilePageProps = {
  userId: string;
};

export function PublicProfilePage({ userId }: PublicProfilePageProps) {
  const { authenticatedFetch } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getPublicProfile(authenticatedFetch, userId, controller.signal)
      .then((loadedProfile) => {
        setProfile(loadedProfile);
        setError("");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setProfile(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "We could not load this profile. Please try again.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadedUserId(userId);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [authenticatedFetch, reloadKey, userId]);

  const isCurrentProfileLoaded = loadedUserId === userId;

  return (
    <section aria-labelledby="public-profile-heading" className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-moss">Relay member</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="public-profile-heading"
      >
        Profile
      </h1>
      {isLoading || !isCurrentProfileLoaded ? (
        <div
          aria-label="Loading profile"
          className="mt-8 h-64 animate-pulse rounded-3xl border border-line bg-surface"
          role="status"
        >
          <span className="sr-only">Loading profile…</span>
        </div>
      ) : error ? (
        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
            {error}
          </p>
          {error === "This profile could not be found." ? (
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-moss underline underline-offset-4"
              href="/app"
            >
              Return to your workspace
            </Link>
          ) : (
            <Button
              className="mt-4"
              onClick={() => {
                setIsLoading(true);
                setError("");
                setLoadedUserId(null);
                setReloadKey((key) => key + 1);
              }}
              type="button"
            >
              Try again
            </Button>
          )}
        </div>
      ) : isCurrentProfileLoaded && profile ? (
        <div className="mt-8 space-y-5">
          <ProfileCard profile={profile} />
          <UserConnectionActions
            displayName={profile.display_name}
            userId={profile.id}
          />
        </div>
      ) : (
        <p className="mt-8 rounded-3xl border border-line bg-surface p-6 text-sm text-muted">
          This profile is not available.
        </p>
      )}
    </section>
  );
}
