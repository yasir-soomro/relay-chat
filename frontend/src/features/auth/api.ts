import type {
  AuthFieldName,
  FieldErrors,
  LoginValues,
  RegistrationResponse,
  RegistrationValues,
  TokenResponse,
} from "@/features/auth/types";

const authFieldNames = [
  "email",
  "username",
  "display_name",
  "password",
] as const satisfies readonly AuthFieldName[];

const validationMessages: Record<AuthFieldName, string> = {
  email: "Enter a valid email address.",
  username: "Use 3–30 lowercase letters, numbers, or underscores.",
  display_name: "Display name must be between 1 and 50 characters.",
  password: "Password must be between 12 and 128 characters.",
};

export class AuthenticationRequestError extends Error {
  readonly fieldErrors: FieldErrors;
  readonly status: number;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "AuthenticationRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function postJson(path: string, payload: object): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthenticationRequestError(
      0,
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const fieldErrors = extractFieldErrors(body);

    if (response.status === 409) {
      throw new AuthenticationRequestError(
        response.status,
        "That email address or username is already in use.",
        fieldErrors,
      );
    }

    if (response.status === 401) {
      throw new AuthenticationRequestError(
        response.status,
        "The email or password you entered is incorrect.",
      );
    }

    if (response.status === 403) {
      throw new AuthenticationRequestError(
        response.status,
        "Sign in is not enabled for this site yet. Please try again later.",
      );
    }

    if (response.status === 422) {
      throw new AuthenticationRequestError(
        response.status,
        "Check the highlighted details and try again.",
        fieldErrors,
      );
    }

    if (response.status >= 500) {
      throw new AuthenticationRequestError(
        response.status,
        "Relay is temporarily unavailable. Please try again shortly.",
      );
    }

    throw new AuthenticationRequestError(
      response.status,
      "We could not complete your request. Please try again.",
    );
  }

  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthFieldName(value: unknown): value is AuthFieldName {
  return (
    typeof value === "string" &&
    authFieldNames.some((field) => field === value)
  );
}

function invalidResponse(): AuthenticationRequestError {
  return new AuthenticationRequestError(
    502,
    "Relay returned an unexpected response. Please try again.",
  );
}

function parseRegistrationResponse(body: unknown): RegistrationResponse {
  if (!isRecord(body) || !isRecord(body.user)) {
    throw invalidResponse();
  }

  const { user } = body;
  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.username !== "string" ||
    typeof user.display_name !== "string" ||
    (typeof user.bio !== "string" && user.bio !== null) ||
    typeof user.created_at !== "string" ||
    typeof user.updated_at !== "string"
  ) {
    throw invalidResponse();
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };
}

function parseTokenResponse(body: unknown): TokenResponse {
  if (
    !isRecord(body) ||
    typeof body.access_token !== "string" ||
    body.token_type !== "bearer" ||
    typeof body.expires_in !== "number" ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0
  ) {
    throw invalidResponse();
  }

  return {
    access_token: body.access_token,
    token_type: "bearer",
    expires_in: body.expires_in,
  };
}

function extractFieldErrors(body: unknown): FieldErrors {
  if (!isRecord(body) || !Array.isArray(body.detail)) {
    return {};
  }

  const errors: FieldErrors = {};

  for (const item of body.detail) {
    if (!isRecord(item) || !Array.isArray(item.loc)) {
      continue;
    }

    const field = item.loc.at(-1);
    if (isAuthFieldName(field) && !(field in errors)) {
      errors[field] = validationMessages[field];
    }
  }

  return errors;
}

export function register(
  values: RegistrationValues,
): Promise<RegistrationResponse> {
  return postJson("/auth/register", {
    email: values.email.trim().toLowerCase(),
    username: values.username,
    display_name: values.display_name,
    password: values.password,
  }).then(parseRegistrationResponse);
}

export async function login(values: LoginValues): Promise<TokenResponse> {
  const body = await postJson("/auth/login", {
    email: values.email.trim().toLowerCase(),
    password: values.password,
  });
  return parseTokenResponse(body);
}
