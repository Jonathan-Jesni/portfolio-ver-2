import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF (smaller than WebP) where supported, falling back to WebP.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Tighter tree-shaking of the drei barrel (only the helpers we import).
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
