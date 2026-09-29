import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // permite enviar una imagen de hasta 4 MB a las Server Actions (el default es 1 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
