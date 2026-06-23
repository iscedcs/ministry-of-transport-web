/**
 * Root Layout — Ministry of Transport Platform
 * Reference: docs/DESIGN_SYSTEM.md | docs/IMPLEMENTATION_PLAN.md
 *
 * Fonts: Geist Sans (body), Geist Mono (code/data), Space Grotesk (display headings)
 * Theme: Dark — brand gold (#f0bb0d) on dark brown (#452829) — all in OKLCH tokens
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — Ministry of Transport",
    default: "Ministry of Transport | Anambra State",
  },
  description:
    "Integrated Transport Services Automation Platform — Motor Park approvals, Mass Transit registration, AVIR reporting, and compliance management for Anambra State.",
  robots: { index: false, follow: false }, // Internal platform — not for public indexing
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
                          <Toaster richColors position="bottom-right"/>

      </body>
    </html>
  );
}
