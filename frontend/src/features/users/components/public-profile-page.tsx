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
  const { account, authenticatedFetch } = useAuth();
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
    <section
      aria-labelledby="public-profile-heading"
      className="public-profile-page profile-page mx-auto w-full max-w-5xl"
    >
      <header className="public-profile-heading">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Relay member
        </p>
        <h1
          className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[2rem]"
          id="public-profile-heading"
        >
          Public profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          A little more about the people who make Relay feel connected.
        </p>
      </header>

      {isLoading || !isCurrentProfileLoaded ? (
        <div
          aria-label="Loading profile"
          className="public-profile-layout mt-6"
          role="status"
        >
          <span className="sr-only">Loading profile…</span>
          <div
            aria-hidden="true"
            className="public-profile-skeleton public-profile-skeleton-main"
          />
          <div
            aria-hidden="true"
            className="public-profile-skeleton public-profile-skeleton-aside"
          />
        </div>
      ) : error ? (
        <div className="public-profile-message mt-6">
          <div className="public-profile-message-icon" aria-hidden="true">
            !
          </div>
          <p className="text-sm leading-6 text-danger" role="alert">
            {error}
          </p>
          {error === "This profile could not be found." ? (
            <Link
              className="public-profile-link mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-primary"
              href="/conversations"
            >
              Return to your workspace
            </Link>
          ) : (
            <Button
              className="mt-4 min-h-9 rounded-lg px-4 py-2 text-xs"
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
        <div className="public-profile-layout mt-6">
          <ProfileCard
            className="public-profile-card"
            profile={profile}
          />
          <aside
            aria-label={`Connect with ${profile.display_name}`}
            className="public-profile-connect-card"
          >
            <div className="public-profile-connect-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                  d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20m16-9a3 3 0 0 1 2 2.8V15m-4-12.5a3 3 0 0 1 0 5.8M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            {account?.id === profile.id ? (
              <>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  Your public profile
                </p>
                <h2 className="mt-2 text-base font-semibold leading-6 text-ink">
                  This is how other Relay members see you.
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Keep your public profile up to date from your workspace.
                </p>
                <Link
                  className="public-profile-link mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
                  href="/app/profile"
                >
                  Edit your profile
                </Link>
              </>
            ) : (
              <>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  Build a connection
                </p>
                <h2 className="mt-2 text-base font-semibold leading-6 text-ink">
                  Say hello to {profile.display_name}.
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Good conversations start with a simple introduction.
                </p>
                <div className="public-profile-actions mt-5">
                  <UserConnectionActions
                    displayName={profile.display_name}
                    userId={profile.id}
                  />
                </div>
                <Link
                  className="public-profile-link mt-4 inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-muted"
                  href="/conversations"
                >
                  Back to your workspace
                </Link>
              </>
            )}
          </aside>
        </div>
      ) : (
        <p className="public-profile-message mt-6 text-sm text-muted">
          This profile is not available.
        </p>
      )}
    </section>
  );
}
