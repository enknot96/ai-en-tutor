import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // TEMP: allow Cloudflare Tunnel in dev. Remove after the iPhone test.
  allowedDevOrigins: ["*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
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
