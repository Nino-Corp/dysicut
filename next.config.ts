import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/admin/:path*", headers: [...noindex, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/calendar/:path*", headers: noindex },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    // Images locales et proxy du feed Instagram (/api/ig/media/<code>).
    localPatterns: [{ pathname: "/api/ig/media/**" }, { pathname: "/cuts/**" }, { pathname: "/brand/**" }],
  },
};

export default nextConfig;
