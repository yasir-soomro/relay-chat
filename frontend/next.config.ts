import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiOrigin = (
      process.env.RELAY_API_ORIGIN ?? "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/auth",
        destination: `${apiOrigin}/auth`,
      },
      {
        source: "/auth/:path*",
        destination: `${apiOrigin}/auth/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
