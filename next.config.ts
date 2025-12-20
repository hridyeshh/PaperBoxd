import type { NextConfig } from "next";

const isCapacitorBuild = !!process.env.CAPACITOR_BUILD;

const nextConfig: NextConfig = {
  // Only enable static export when building for Capacitor (iOS)
  output: isCapacitorBuild ? "export" : undefined,
  reactStrictMode: true,
  trailingSlash: true,
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
      {
        protocol: "https",
        hostname: "images.isbndb.com",
      },
      {
        protocol: "https",
        hostname: "covers.isbndb.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // Disable optimization only for the Capacitor/iOS static export
    unoptimized: isCapacitorBuild,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // Cache for 30 days
  },
  // Exclude API routes and replace middleware for Capacitor builds
  webpack: (config) => {
    if (isCapacitorBuild) {
      // Ignore API routes
      config.module.rules.push({
        test: /app\/api\/.*/,
        loader: "ignore-loader",
      });

      // Replace middleware.ts with middleware.capacitor.ts for Capacitor builds
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpack = require("webpack");
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /middleware\.ts$/,
          require.resolve("./middleware.capacitor.ts")
        )
      );
    }
    return config;
  },
};

export default nextConfig;
