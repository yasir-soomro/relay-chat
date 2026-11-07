import { afterEach, describe, expect, it } from "vitest";
import nextConfig from "../next.config";

const originalApiOrigin = process.env.RELAY_API_ORIGIN;

afterEach(() => {
  if (originalApiOrigin === undefined) {
    delete process.env.RELAY_API_ORIGIN;
  } else {
    process.env.RELAY_API_ORIGIN = originalApiOrigin;
  }
});

describe("Next.js backend rewrites", () => {
  it("proxies all existing REST API prefixes to the configured backend", async () => {
    process.env.RELAY_API_ORIGIN = "https://api.relay.test/";
    const rewrites = await nextConfig.rewrites?.();

    expect(rewrites).toEqual(
      expect.arrayContaining([
        {
          source: "/auth/:path*",
          destination: "https://api.relay.test/auth/:path*",
        },
        {
          source: "/users/:path*",
          destination: "https://api.relay.test/users/:path*",
        },
        {
          source: "/connections/:path*",
          destination: "https://api.relay.test/connections/:path*",
        },
        {
          source: "/conversations/:path*",
          destination: "https://api.relay.test/conversations/:path*",
        },
        {
          source: "/messages/:path*",
          destination: "https://api.relay.test/messages/:path*",
        },
      ]),
    );
  });
});
