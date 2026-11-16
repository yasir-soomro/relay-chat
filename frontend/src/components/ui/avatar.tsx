type AvatarProps = {
  className?: string;
  fallbackName?: string;
  name: string;
  size?: "small" | "large";
};

function getInitials(name: string, fallbackName: string) {
  const words = (name.trim() || fallbackName.trim()).split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return words[0]?.slice(0, 2).toUpperCase() || "?";
}

export function Avatar({
  className = "",
  fallbackName = "",
  name,
  size = "large",
}: AvatarProps) {
  const accessibleName = name.trim() || fallbackName.trim() || "User";

  return (
    <div
      aria-label={`${accessibleName} avatar`}
      className={`grid shrink-0 place-items-center rounded-full bg-soft font-semibold tracking-wide text-primary ring-1 ring-line ${
        size === "small"
          ? "size-12 text-sm"
          : "size-20 text-2xl sm:size-24 sm:text-3xl"
      } ${className}`.trim()}
      role="img"
    >
      {getInitials(name, fallbackName)}
    </div>
  );
}
