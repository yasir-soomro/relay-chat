"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { ProfileCard } from "@/features/users/components/profile-card";
import { ProfileEditor } from "@/features/users/components/profile-editor";
import {
  getMyProfile,
  updateMyProfile,
} from "@/features/users/api";
import { useAuth } from "@/features/auth/providers/auth-provider";
import type {
  UserAccountProfile,
  UserProfileValues,
} from "@/features/users/types";

export function MyProfilePage() {
  const { authenticatedFetch } = useAuth();
  const [profile, setProfile] = useState<UserAccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getMyProfile(authenticatedFetch, controller.signal)
      .then(setProfile)
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : "We could not load your profile. Please try again.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [authenticatedFetch, reloadKey]);

  const saveProfile = useCallback(
    (values: UserProfileValues) => updateMyProfile(authenticatedFetch, values),
    [authenticatedFetch],
  );

  function handleSaved(updatedProfile: UserAccountProfile) {
    setProfile(updatedProfile);
    setSaved(true);
    setIsEditing(false);
  }

  return (
    <section aria-labelledby="profile-heading" className="profile-page mx-auto w-full max-w-5xl">
      <h1
        className="text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-[2rem]"
        id="profile-heading"
      >
        A little more you.
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {isEditing
          ? "Update the details people see when they discover your profile."
          : "Manage how you appear to people across Relay."}
      </p>

      {isLoading ? (
        <div
          aria-label="Loading your profile"
          className="mt-8 h-64 animate-pulse rounded-3xl border border-line bg-surface"
          role="status"
        >
          <span className="sr-only">Loading your profile…</span>
        </div>
      ) : loadError ? (
        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm leading-6 text-danger" role="alert">
            {loadError}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setIsLoading(true);
              setLoadError("");
              setReloadKey((key) => key + 1);
            }}
            type="button"
          >
            Try again
          </Button>
        </div>
      ) : profile ? (
        <div className="profile-mode-content mt-6">
          {saved ? (
            <p
              aria-live="polite"
              className="mb-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-success"
              role="status"
            >
              Your profile has been updated.
            </p>
          ) : null}
          {isEditing ? (
            <ProfileEditor
              key={profile.updated_at}
              initialValues={{
                username: profile.username,
                display_name: profile.display_name,
                bio: profile.bio ?? "",
              }}
              onCancel={() => setIsEditing(false)}
              onSave={saveProfile}
              onSaved={handleSaved}
              onValuesChange={() => setSaved(false)}
            />
          ) : (
            <div className="profile-view-grid grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.85fr)]">
              <ProfileCard profile={profile} />
              <aside
                aria-label="Profile visibility"
                className={`${surfaceCardClassName} profile-view-aside min-w-0 p-5`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  Your profile
                </p>
                <h2 className="mt-3 text-base font-semibold text-ink">
                  Make it personal, keep it safe.
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Your name, username, and bio are visible to Relay members.
                  Keep private information out of your bio.
                </p>
                <Link
                  className="mt-5 inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  href={`/app/users/${encodeURIComponent(profile.id)}`}
                >
                  View public profile
                </Link>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button
                    className="min-h-9 rounded-lg px-4 py-2 text-xs"
                    onClick={() => {
                      setSaved(false);
                      setIsEditing(true);
                    }}
                    type="button"
                  >
                    Edit profile
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 rounded-3xl border border-line bg-surface p-6 text-sm text-muted">
          Your profile is not available.
        </p>
      )}
    </section>
  );
}
