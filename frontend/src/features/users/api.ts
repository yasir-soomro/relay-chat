import type {
  AuthenticatedRequest,
  ProfileFieldErrors,
  ProfileFieldName,
  UserAccountProfile,
  UserDiscoveryPage,
  UserProfile,
  UserProfileValues,
} from "@/features/users/types";

const profileFields = [
  "username",
  "display_name",
  "bio",
] as const satisfies readonly ProfileFieldName[];

const validationMessages: Record<ProfileFieldName, string> = {
  username: "Use 3–30 lowercase letters, numbers, or underscores.",
  display_name: "Display name must be between 1 and 50 characters.",
  bio: "Bio must be 160 characters or fewer.",
};

export class UserRequestError extends Error {
  readonly fieldErrors: ProfileFieldErrors;
  readonly status: number;

  constructor(
    status: number,
    message: string,
    fieldErrors: ProfileFieldErrors = {},
  ) {
    super(message);
    this.name = "UserRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProfileField(value: unknown): value is ProfileFieldName {
  return (
    typeof value === "string" &&
    profileFields.some((field) => field === value)
  );
}

function invalidResponse(): UserRequestError {
  return new UserRequestError(
    502,
    "Relay returned an unexpected profile response. Please try again.",
  );
}

function parsePublicProfile(body: unknown): UserProfile {
  if (
    !isRecord(body) ||
    typeof body.id !== "string" ||
    typeof body.username !== "string" ||
    typeof body.display_name !== "string" ||
    (typeof body.bio !== "string" && body.bio !== null)
  ) {
    throw invalidResponse();
  }

  return {
    id: body.id,
    username: body.username,
    display_name: body.display_name,
    bio: body.bio,
  };
}

function parseDiscoveryPage(body: unknown): UserDiscoveryPage {
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    (typeof body.next_cursor !== "string" && body.next_cursor !== null)
  ) {
    throw new UserRequestError(
      502,
      "Relay returned an unexpected discovery response. Please try again.",
    );
  }

  return {
    items: body.items.map(parsePublicProfile),
    next_cursor: body.next_cursor,
  };
}

function parseAccountProfile(body: unknown): UserAccountProfile {
  const profile = parsePublicProfile(body);
  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    typeof body.created_at !== "string" ||
    typeof body.updated_at !== "string"
  ) {
    throw invalidResponse();
  }

  return {
    ...profile,
    email: body.email,
    created_at: body.created_at,
    updated_at: body.updated_at,
  };
}

function extractFieldErrors(body: unknown): ProfileFieldErrors {
  if (!isRecord(body) || !Array.isArray(body.detail)) {
    return {};
  }

  const errors: ProfileFieldErrors = {};
  for (const item of body.detail) {
    if (!isRecord(item) || !Array.isArray(item.loc)) {
      continue;
    }

    const field = item.loc.at(-1);
    if (isProfileField(field) && !(field in errors)) {
      errors[field] = validationMessages[field];
    }
  }

  return errors;
}

async function request(
  authenticatedFetch: AuthenticatedRequest,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, {
      cache: "no-store",
      ...init,
    });
  } catch (error) {
    if (error instanceof UserRequestError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new UserRequestError(
      0,
      "Relay could not be reached. Check your connection and try again.",
    );
  }

  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) {
      throw new UserRequestError(response.status, "This profile could not be found.");
    }
    if (response.status === 409) {
      throw new UserRequestError(
        response.status,
        "That username is already in use. Choose another username.",
        { username: "That username is already in use." },
      );
    }
    if (response.status === 422) {
      const fieldErrors = extractFieldErrors(body);
      throw new UserRequestError(
        response.status,
        "Check the highlighted profile details and try again.",
        fieldErrors,
      );
    }
    if (response.status === 403) {
      throw new UserRequestError(
        response.status,
        "You do not have permission to view this profile.",
      );
    }
    if (response.status >= 500) {
      throw new UserRequestError(
        response.status,
        "Relay is temporarily unavailable. Please try again shortly.",
      );
    }
    throw new UserRequestError(
      response.status,
      "We could not load this profile. Please try again.",
    );
  }

  return body;
}

export async function getMyProfile(
  authenticatedFetch: AuthenticatedRequest,
  signal?: AbortSignal,
): Promise<UserAccountProfile> {
  const body = await request(authenticatedFetch, "/users/me", {
    method: "GET",
    signal,
  });
  return parseAccountProfile(body);
}

export async function getPublicProfile(
  authenticatedFetch: AuthenticatedRequest,
  userId: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const body = await request(
    authenticatedFetch,
    `/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      signal,
    },
  );
  return parsePublicProfile(body);
}

export async function discoverUsers(
  authenticatedFetch: AuthenticatedRequest,
  {
    q,
    limit = 20,
    cursor,
  }: { q?: string; limit?: number; cursor?: string },
  signal?: AbortSignal,
): Promise<UserDiscoveryPage> {
  if (q && !/^[A-Za-z0-9_]{1,30}$/.test(q)) {
    throw new UserRequestError(
      422,
      "Search using 1–30 letters, numbers, or underscores.",
    );
  }
  const search = new URLSearchParams({ limit: String(limit) });
  if (q) {
    search.set("q", q);
  }
  if (cursor) {
    search.set("cursor", cursor);
  }
  const body = await request(
    authenticatedFetch,
    `/api/v1/users/discover?${search.toString()}`,
    {
      method: "GET",
      signal,
    },
  );
  return parseDiscoveryPage(body);
}

export async function updateMyProfile(
  authenticatedFetch: AuthenticatedRequest,
  values: UserProfileValues,
): Promise<UserAccountProfile> {
  const body = await request(authenticatedFetch, "/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: values.username,
      display_name: values.display_name,
      bio: values.bio === "" ? null : values.bio,
    }),
  });
  return parseAccountProfile(body);
}
