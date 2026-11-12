import type { NextConfig } from "next";

const apiPaths = [
  "auth",
  "users",
  "connections",
  "messages",
] as const;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiOrigin = (
      process.env.RELAY_API_ORIGIN ?? "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    return {
      beforeFiles: [
        {
          source: "/conversations",
          destination: `${apiOrigin}/conversations`,
          has: [
            { type: "header", key: "accept", value: "application/json" },
          ],
        },
        {
          source: "/conversations/:path*",
          destination: `${apiOrigin}/conversations/:path*`,
          has: [
            { type: "header", key: "accept", value: "application/json" },
          ],
        },
      ],
      afterFiles: [
        {
          source: "/ws",
          destination: `${apiOrigin}/ws`,
        },
        {
          source: "/api/v1/users/:path*",
          destination: `${apiOrigin}/api/v1/users/:path*`,
        },
        {
          source: "/api/v1/notifications/:path*",
          destination: `${apiOrigin}/api/v1/notifications/:path*`,
        },
        ...apiPaths.flatMap((path) => [
          {
            source: `/${path}`,
            destination: `${apiOrigin}/${path}`,
          },
          {
            source: `/${path}/:path*`,
            destination: `${apiOrigin}/${path}/:path*`,
          },
        ]),
      ],
    };
  },
};

export default nextConfig;
