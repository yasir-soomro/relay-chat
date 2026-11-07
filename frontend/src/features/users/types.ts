export type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
};

export type UserDiscoveryPage = {
  items: UserProfile[];
  next_cursor: string | null;
};

export type UserAccountProfile = UserProfile & {
  email: string;
  created_at: string;
  updated_at: string;
};

export type UserProfileValues = {
  username: string;
  display_name: string;
  bio: string;
};

export type ProfileFieldName = keyof UserProfileValues;

export type ProfileFieldErrors = Partial<
  Record<ProfileFieldName, string>
>;

export type AuthenticatedRequest = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
