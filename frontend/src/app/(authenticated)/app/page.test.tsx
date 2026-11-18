import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import AppHomePage from "./page";

describe("legacy app route", () => {
  it("redirects authenticated users to conversations", () => {
    expect(() => AppHomePage()).toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/conversations");
  });
});
