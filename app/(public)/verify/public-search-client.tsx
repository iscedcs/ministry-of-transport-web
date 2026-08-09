"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldCheck,
  Bus,
  Ship,
  Building2,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  PublicSearchResult,
  PublicSearchKind,
} from "@/app/actions/public-search";

const KIND_ICON: Record<PublicSearchKind, React.ReactNode> = {
  TRACAS_VEHICLE: <Bus className="w-4 h-4" />,
  TRANSIT_VEHICLE: <Bus className="w-4 h-4" />,
  BOAT: <Ship className="w-4 h-4" />,
  MOTOR_PARK: <Building2 className="w-4 h-4" />,
};

const TONE: Record<
  PublicSearchResult["statusTone"],
  { chip: string; dot: string }
> = {
  good: {
    chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  warn: {
    chip: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
  },
  bad: {
    chip: "bg-red-500/10 text-red-400 border-red-500/25",
    dot: "bg-red-400",
  },
  neutral: {
    chip: "bg-slate-500/10 text-slate-400 border-slate-500/25",
    dot: "bg-slate-400",
  },
};

export function PublicSearchClient({
  query,
  results,
  interpreted,
  error,
  searched,
}: {
  query: string;
  results: PublicSearchResult[];
  interpreted?: string;
  error?: string;
  searched: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setSubmitting(true);
    router.push(`/verify?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search card */}
      <div className="relative bg-card border border-border/70 rounded-2xl p-6 sm:p-10 shadow-xl overflow-hidden text-card-foreground">
        {/* Background watermark crest */}
        <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none z-0 flex items-center justify-center">
          <Image
            src="/anambra_mot_logo.png"
            alt=""
            aria-hidden="true"
            width={350}
            height={350}
            className="opacity-[0.05] object-contain select-none"
          />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header with accent bar */}
          <div className="flex items-start gap-4">
            <div className="w-1.5 bg-primary rounded-full h-14 shrink-0 mt-0.5 shadow-sm" />
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Verify Transport Identity
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Enter a Plate Number, Fleet Number, Authority Reference, Sticker
                Code, ASIN or Park Name to retrieve registration and
                authorisation records.
              </p>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={submit} className="space-y-3">
            <label
              htmlFor="verify-query"
              className="block text-sm font-semibold text-foreground">
              Transport Identifier (Plate, Fleet No., Authority Ref, or Name)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="verify-query"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. NSH266YJ, LV050, TRAC-56374-AN, or Central Motor Park"
                  autoComplete="off"
                  className="h-14 pl-12 pr-4 bg-background border-border rounded-xl text-base focus-visible:ring-primary focus-visible:border-primary shadow-inner w-full text-foreground"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !value.trim()}
                className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer shrink-0">
                <ShieldCheck className="w-5 h-5" />
                {submitting ? "Verifying..." : "Verify"}
              </Button>
            </div>
            {interpreted && (
              <p className="text-xs text-muted-foreground">
                Recognised as:{" "}
                <span className="text-foreground font-medium">
                  {interpreted}
                </span>
              </p>
            )}
          </form>

          {/* Bottom links */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Official Anambra State Transport Verification Portal</span>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <span>View All Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-8 space-y-4">
          {error ? (
            <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border shadow-sm p-6 text-card-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <SearchX className="w-7 h-7" />
              </div>
              <p className="font-bold text-foreground">
                No record found for “{query}”
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                Check the spelling and try again. If a vehicle is displaying a
                Ministry sticker but does not appear here, please report it to
                the Ministry of Transport.
              </p>
            </div>
          ) : (
            results.map((r) => {
              const tone = TONE[r.statusTone];
              return (
                <Link
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  className="group block rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {KIND_ICON[r.kind]}
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          {r.subtitle}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {r.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone.chip}`}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
                        />
                        {r.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3.5 pt-4 border-t border-border/50">
                    {r.facts.map((f) => (
                      <div key={f.label} className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {f.label}
                        </dt>
                        <dd className="text-sm text-foreground truncate mt-0.5">
                          {f.value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Privacy note — sets expectations about what is deliberately absent */}
      <p className="mt-10 text-center text-[11px] text-muted-foreground max-w-lg mx-auto">
        This service confirms registration and authorisation status only. Owner
        contact details, chassis and engine numbers are not published. For
        enforcement enquiries, contact the Ministry of Transport.
      </p>
    </div>
  );
}
