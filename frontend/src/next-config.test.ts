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
    if (!rewrites || Array.isArray(rewrites)) {
      throw new Error("Expected phase-specific rewrite rules.");
    }

    expect(rewrites.afterFiles).toEqual(
      expect.arrayContaining([
        {
          source: "/ws",
          destination: "https://api.relay.test/ws",
        },
        {
          source: "/auth/:path*",
          destination: "https://api.relay.test/auth/:path*",
        },
        {
          source: "/users/:path*",
          destination: "https://api.relay.test/users/:path*",
        },
        {
          source: "/api/v1/users/:path*",
          destination: "https://api.relay.test/api/v1/users/:path*",
        },
        {
          source: "/api/v1/notifications/:path*",
          destination: "https://api.relay.test/api/v1/notifications/:path*",
        },
        {
          source: "/connections/:path*",
          destination: "https://api.relay.test/connections/:path*",
        },
        {
          source: "/messages/:path*",
          destination: "https://api.relay.test/messages/:path*",
        },
      ]),
    );

    expect(rewrites.beforeFiles).toEqual(
      expect.arrayContaining([
        {
          source: "/conversations",
          destination: "https://api.relay.test/conversations",
          has: [
            { type: "header", key: "accept", value: "application/json" },
          ],
        },
        {
          source: "/conversations/:path*",
          destination: "https://api.relay.test/conversations/:path*",
          has: [
            { type: "header", key: "accept", value: "application/json" },
          ],
        },
      ]),
    );
  });
});
