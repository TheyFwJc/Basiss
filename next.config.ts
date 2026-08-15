import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Broker CSV exports can run to several thousand rows of plain text —
    // comfortably past the 1MB default for a Server Action request body.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    // Trade screenshots are served from Vercel Blob's public storage domain.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
