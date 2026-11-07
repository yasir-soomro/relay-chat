import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import { surfaceCardClassName } from "@/components/ui/card";
import type { UserProfile } from "@/features/users/types";

type ProfileCardProps = {
  profile: UserProfile;
  email?: string;
};

export function ProfileCard({ profile, email }: ProfileCardProps) {
  return (
    <section
      aria-label={`${profile.display_name}'s profile`}
      className={`${surfaceCardClassName} p-6 sm:p-8`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <ProfileAvatar
          displayName={profile.display_name}
          username={profile.username}
        />
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {profile.display_name}
          </h2>
          <p className="mt-1 text-sm font-medium text-moss">
            @{profile.username}
          </p>
          {email ? (
            <p className="mt-2 break-all text-sm text-muted">{email}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          About
        </h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
          {profile.bio?.trim() || (
            <span className="text-muted">No bio added yet.</span>
          )}
        </p>
      </div>
    </section>
  );
}
