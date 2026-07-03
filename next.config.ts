import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF (smaller than WebP) where supported, falling back to WebP.
    formats: ["image/avif", "image/webp"],
    // 75 = default (carousel); 95 = near-lossless for the lightbox, where
    // technical result images are inspected at full detail.
    qualities: [75, 95],
  },
  experimental: {
    // Tighter tree-shaking of the drei barrel (only the helpers we import).
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
