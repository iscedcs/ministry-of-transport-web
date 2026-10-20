import type { NextConfig } from "next";
import { execSync } from "child_process";

let lastUpdatedDate = "4 May 2026";
try {
  const gitDate = execSync('git log -1 --grep="feat: " --format=%cd --date=format:"%e %B %Y"').toString().trim();
  if (gitDate) {
    lastUpdatedDate = gitDate;
  }
} catch (e) {
  // Ignore error if git is not available or no commit matches
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LAST_UPDATED: lastUpdatedDate,
  },
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "isce-image.fra1.digitaloceanspaces.com",
      },
    ],
  },
  async redirects() {
    return [
      // /v/status<id> and /v/status/<id> are handled by the catch-all
      // sticker resolver at app/(public)/v/[...code], not redirected here.
      {
        source: "/verify/status/:id",
        destination: "/verify/tracas/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
