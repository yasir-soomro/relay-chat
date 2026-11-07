import Link from "next/link";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import type { UserProfile } from "@/features/users/types";

type ConversationParticipantProps = {
  profile: UserProfile | null;
  userId: string;
  compact?: boolean;
  linkToProfile?: boolean;
};

export function ConversationParticipant({
  profile,
  userId,
  compact = false,
  linkToProfile = true,
}: ConversationParticipantProps) {
  const displayName = profile?.display_name ?? "Relay member";
  const username = profile?.username ?? "member";
  const details = (
    <>
      <ProfileAvatar
        displayName={displayName}
        size={compact ? "small" : "large"}
        username={username}
      />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">
          {displayName}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted">
          {profile ? `@${profile.username}` : "Profile unavailable"}
        </span>
      </span>
    </>
  );

  return (
    <span className={`flex min-w-0 items-center ${compact ? "gap-3" : "gap-4"}`}>
      {profile && linkToProfile ? (
        <Link
          aria-label={`View ${displayName}'s profile`}
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-moss"
          href={`/app/users/${encodeURIComponent(userId)}`}
        >
          {details}
        </Link>
      ) : (
        <span className="flex min-w-0 items-center gap-3">{details}</span>
      )}
    </span>
  );
}
