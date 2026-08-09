/**
 * Public verification portal — the single lookup for everything the Ministry
 * registers. A plate, fleet number, authority reference, sticker code, ANSSID
 * or park name all go in the same box; the search works out which register the
 * value belongs to.
 *
 * Deep links (/verify/tracas/[ref], /verify/boat/[id], …) are unchanged —
 * they are printed on stickers, ID cards and letters already in circulation.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { publicSearch } from "@/app/actions/public-search";
import { PublicSearchClient } from "./public-search-client";

export const metadata: Metadata = {
  title: "Verify | Ministry of Transport, Anambra State",
  description:
    "Public verification portal — check whether a vehicle, motor park or vessel is registered and authorised to operate in Anambra State.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const res = query ? await publicSearch(query) : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/anambra_mot_logo.png"
              alt="Anambra State Ministry of Transport"
              width={40}
              height={40}
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
            />
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">
                Anambra State Government
              </p>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                Ministry of Transport
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest border border-primary/20">
              Public Portal
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-display">
              Transport Verification
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Check any vehicle, motor park or vessel registered in Anambra
              State — no login required.
            </p>
          </div>

          <PublicSearchClient
            query={query}
            results={res?.data ?? []}
            interpreted={res?.interpreted}
            error={res && !res.success ? res.error : undefined}
            searched={!!query}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} Anambra State Ministry of Transport.
            All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/services" className="hover:underline">
              Services
            </Link>
            <Link
              href="/staff/login"
              className="hover:underline text-primary font-medium">
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
