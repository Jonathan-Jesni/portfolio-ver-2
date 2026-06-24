import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF (smaller than WebP) where supported, falling back to WebP.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
