import { describe, expect, it } from "vitest";
import { validateUserProfile } from "@/features/users/schemas";
import type { UserProfileValues } from "@/features/users/types";

const validProfile: UserProfileValues = {
  username: "relay_user",
  display_name: "Relay User",
  bio: "Hello there",
};

describe("validateUserProfile", () => {
  it("accepts valid profile values including the maximum bio length", () => {
    expect(
      validateUserProfile({ ...validProfile, bio: "a".repeat(160) }),
    ).toEqual({});
  });

  it("matches the backend username and display-name constraints", () => {
    expect(
      validateUserProfile({
        ...validProfile,
        username: "Relay User",
        display_name: "",
      }),
    ).toEqual({
      username: "Use 3–30 lowercase letters, numbers, or underscores.",
      display_name: "Display name must be between 1 and 50 characters.",
    });
  });

  it("rejects bios longer than 160 characters", () => {
    expect(
      validateUserProfile({ ...validProfile, bio: "a".repeat(161) }),
    ).toEqual({ bio: "Bio must be 160 characters or fewer." });
  });
});
