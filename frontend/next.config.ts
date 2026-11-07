import type { NextConfig } from "next";

const apiPaths = [
  "auth",
  "users",
  "connections",
  "conversations",
  "messages",
] as const;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiOrigin = (
      process.env.RELAY_API_ORIGIN ?? "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    return apiPaths.flatMap((path) => [
      {
        source: `/${path}`,
        destination: `${apiOrigin}/${path}`,
      },
      {
        source: `/${path}/:path*`,
        destination: `${apiOrigin}/${path}/:path*`,
      },
    ]);
  },
};

export default nextConfig;
