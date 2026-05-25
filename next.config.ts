import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eonnclxailqolpldtmob.supabase.co",
      },
    ],
  },
};

export default nextConfig;