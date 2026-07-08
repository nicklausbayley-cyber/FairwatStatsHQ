import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.github.dev", "*.app.github.dev"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.github.dev", "*.app.github.dev"]
    }
  }
};

export default nextConfig;
