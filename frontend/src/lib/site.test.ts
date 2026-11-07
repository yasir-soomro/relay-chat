import { describe, expect, it } from "vitest";
import { siteNavigation } from "@/lib/site";

describe("public navigation", () => {
  it("provides direct sign-in and registration links", () => {
    expect(siteNavigation).toContainEqual({
      href: "/login",
      label: "Sign in",
    });
    expect(siteNavigation).toContainEqual({
      href: "/register",
      label: "Create account",
    });
  });
});
