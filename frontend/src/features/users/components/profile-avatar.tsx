type ProfileAvatarProps = {
  displayName: string;
  username: string;
};

function initials(displayName: string, username: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const name = words.length > 0 ? words : [username];

  if (name.length > 1) {
    return `${name[0][0]}${name[name.length - 1][0]}`.toUpperCase();
  }
  return name[0].slice(0, 2).toUpperCase();
}

export function ProfileAvatar({
  displayName,
  username,
}: ProfileAvatarProps) {
  return (
    <div
      aria-label={`${displayName} avatar`}
      className="grid size-20 shrink-0 place-items-center rounded-full bg-soft text-2xl font-semibold tracking-wide text-moss ring-1 ring-line sm:size-24 sm:text-3xl"
      role="img"
    >
      {initials(displayName, username)}
    </div>
  );
}
