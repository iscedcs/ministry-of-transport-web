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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "isce-image.fra1.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
