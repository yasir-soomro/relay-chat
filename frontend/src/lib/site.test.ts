import { describe, expect, it } from "vitest";
import { siteNavigation } from "@/lib/site";

describe("public navigation", () => {
  it("provides direct sign-in and registration links", () => {
    expect(siteNavigation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/login",
          label: "Sign in",
        }),
        expect.objectContaining({
          href: "/register",
          label: "Create account",
        }),
      ]),
    );
  });
});
