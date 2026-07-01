import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anambra Ministry of Transport",
    short_name: "Anambra MOT",
    description:
      "Integrated Transport Services Automation Platform — Motor Park approvals, Mass Transit registration, and compliance management for Anambra State.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a191c",
    theme_color: "#f0bb0d",
    categories: ["government", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Verify Motor Park",
        short_name: "Verify Park",
        description: "Quickly verify a motor park registration",
        url: "/verify/motor-parks",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Staff Portal",
        short_name: "Staff Login",
        description: "Sign in to the Ministry of Transport staff portal",
        url: "/staff/login",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [],
  };
}
