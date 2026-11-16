import { Avatar } from "@/components/ui/avatar";

type ProfileAvatarProps = {
  displayName: string;
  username: string;
  size?: "small" | "large";
};

export function ProfileAvatar({
  displayName,
  username,
  size = "large",
}: ProfileAvatarProps) {
  return <Avatar fallbackName={username} name={displayName} size={size} />;
}
