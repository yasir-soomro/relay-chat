import type {
  ProfileFieldErrors,
  UserProfileValues,
} from "@/features/users/types";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function validateUserProfile(
  values: UserProfileValues,
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  if (!USERNAME_PATTERN.test(values.username)) {
    errors.username =
      "Use 3–30 lowercase letters, numbers, or underscores.";
  }

  if (
    values.display_name.length < 1 ||
    values.display_name.length > 50
  ) {
    errors.display_name =
      "Display name must be between 1 and 50 characters.";
  }

  if (values.bio.length > 160) {
    errors.bio = "Bio must be 160 characters or fewer.";
  }

  return errors;
}
