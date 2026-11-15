import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    // Images locales et proxy du feed Instagram (/api/ig/media/<code>).
    localPatterns: [{ pathname: "/api/ig/media/**" }, { pathname: "/cuts/**" }, { pathname: "/brand/**" }],
  },
};

export default nextConfig;
