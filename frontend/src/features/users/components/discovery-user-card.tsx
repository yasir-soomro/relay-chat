import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { RelayIcon } from "@/components/ui/relay-icon";
import { UserConnectionActions } from "@/features/connections/components/user-connection-actions";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import type { UserProfile } from "@/features/users/types";

export function DiscoveryUserCard({ profile }: { profile: UserProfile }) {
  return (
    <article
      className={`discovery-card ${surfaceCardClassName} flex h-full min-w-0 flex-col p-4 sm:p-5`}
    >
      <Link
        aria-label={`View ${profile.display_name}'s profile`}
        className="group flex min-w-0 items-center gap-3 focus-visible:outline-focus sm:gap-4"
        href={`/app/users/${encodeURIComponent(profile.id)}`}
      >
        <ProfileAvatar
          displayName={profile.display_name}
          size="small"
          username={profile.username}
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 text-ink transition-colors group-hover:text-primary">
            {profile.display_name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-primary sm:text-sm">
            @{profile.username}
          </p>
        </div>
        <RelayIcon
          className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          name="arrow-right"
        />
      </Link>
      <p className="mt-4 min-h-10 line-clamp-2 break-words text-sm leading-5 text-muted">
        {profile.bio?.trim() || "No bio added yet."}
      </p>
      <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2 border-t border-line pt-4">
        <Link
          className={buttonClassName(
            "secondary",
            "discovery-profile-link min-h-10 min-w-0 flex-[1_1_7rem] rounded-xl px-3 py-2 text-xs sm:text-sm",
          )}
          href={`/app/users/${encodeURIComponent(profile.id)}`}
        >
          View profile
        </Link>
        <div className="min-w-0 flex-[2_1_9rem]">
          <UserConnectionActions
            allowCancelRequest
            compact
            displayName={profile.display_name}
            showBlock={false}
            userId={profile.id}
          />
        </div>
      </div>
    </article>
  );
}
