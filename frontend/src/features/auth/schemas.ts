import type {
  FieldErrors,
  LoginValues,
  RegistrationValues,
} from "@/features/auth/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

function validateCredentials(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  const email = values.email.trim();

  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length < 12 || values.password.length > 128) {
    errors.password = "Password must be between 12 and 128 characters.";
  }

  return errors;
}

export function validateLogin(values: LoginValues): FieldErrors {
  return validateCredentials(values);
}

export function validateRegistration(
  values: RegistrationValues,
): FieldErrors {
  const errors = validateCredentials(values);

  if (!USERNAME_PATTERN.test(values.username)) {
    errors.username =
      "Use 3–30 lowercase letters, numbers, or underscores.";
  }

  if (
    values.display_name.length < 1 ||
    values.display_name.length > 50
  ) {
    errors.display_name = "Display name must be between 1 and 50 characters.";
  }

  return errors;
}
