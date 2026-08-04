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
  async redirects() {
    return [
      // Physical TRACAS stickers encode transpaytms URLs of the form
      // /v/status<id> and /v/status/<id>. Once transpaytms began redirecting
      // here, the slashed form landed on /v/status/<id> — a path this app has
      // no route for, so it 404'd before reaching the lookup. The stickers are
      // already printed and in the field, so the path is absorbed here.
      {
        source: "/v/status/:id",
        destination: "/v/tracas/:id",
        permanent: false,
      },
      {
        source: "/verify/status/:id",
        destination: "/verify/tracas/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
