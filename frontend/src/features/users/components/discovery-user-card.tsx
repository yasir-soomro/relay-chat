import Link from "next/link";
import { surfaceCardClassName } from "@/components/ui/card";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import type { UserProfile } from "@/features/users/types";

export function DiscoveryUserCard({ profile }: { profile: UserProfile }) {
  return (
    <article
      className={`${surfaceCardClassName} min-w-0 p-5 transition-[border-color,box-shadow] sm:p-6`}
    >
      <Link
        aria-label={`View ${profile.display_name}'s profile`}
        className="group flex min-w-0 items-start gap-4 focus-visible:outline-moss sm:gap-5"
        href={`/app/users/${encodeURIComponent(profile.id)}`}
      >
        <ProfileAvatar
          displayName={profile.display_name}
          username={profile.username}
        />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-semibold text-ink group-hover:text-moss">
            {profile.display_name}
          </h2>
          <p className="mt-0.5 break-all text-sm font-medium text-moss">
            @{profile.username}
          </p>
          <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-muted">
            {profile.bio?.trim() || "No bio added yet."}
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 pt-1 text-muted">
          →
        </span>
      </Link>
      <div className="mt-5 border-t border-line pt-4">
        <UserConnectionActions
          compact
          displayName={profile.display_name}
          userId={profile.id}
        />
      </div>
    </article>
  );
}
