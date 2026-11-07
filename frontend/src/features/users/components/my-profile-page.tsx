"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setIsEditing(false);
    setSaved(true);
  }

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-moss">Account</p>
      <h1
        className="mt-2 text-3xl font-medium tracking-[-0.055em] text-ink sm:text-4xl"
        id="profile-heading"
      >
        Your profile
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
        Manage the details you share with other Relay members.
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
          <p className="text-sm leading-6 text-[#8e3027]" role="alert">
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
        <div className="mt-8 space-y-5">
          {saved ? (
            <p
              aria-live="polite"
              className="rounded-xl border border-line bg-soft px-4 py-3 text-sm text-moss"
              role="status"
            >
              Your profile has been updated.
            </p>
          ) : null}
          {isEditing ? (
            <ProfileEditor
              initialValues={{
                username: profile.username,
                display_name: profile.display_name,
                bio: profile.bio ?? "",
              }}
              onCancel={() => setIsEditing(false)}
              onSave={saveProfile}
              onSaved={handleSaved}
            />
          ) : (
            <>
              <ProfileCard profile={profile} email={profile.email} />
              <Button
                onClick={() => {
                  setSaved(false);
                  setIsEditing(true);
                }}
                type="button"
              >
                Edit profile
              </Button>
            </>
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
