import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "http",
        hostname: "covers.openlibrary.org",
      },
    ],
    // Disable image optimization for external book covers to prevent blur
    // Book cover images from APIs are already optimized and small
    // Next.js optimization can reduce quality and cause blur
    unoptimized: false, // Keep optimization enabled globally
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Use high quality for all images
    minimumCacheTTL: 60 * 60 * 24 * 30, // Cache for 30 days
  },
};

export default nextConfig;
