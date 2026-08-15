import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Broker CSV exports can run to several thousand rows of plain text —
    // comfortably past the 1MB default for a Server Action request body.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
