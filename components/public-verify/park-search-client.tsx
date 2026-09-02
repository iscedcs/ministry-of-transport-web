"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Search, MapPin, CheckCircle2, Users, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchPublicMotorParks, type PublicParkSearchResult } from "@/app/actions/public-verify";

export function ParkSearchClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<PublicParkSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await searchPublicMotorParks(query);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setError(res.error || "An error occurred during verification.");
        setResults([]);
      }
    } catch (err) {
      setError("Failed to connect to verification server.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Card inspired by User UI */}
      <div className="relative bg-card border border-border/70 rounded-2xl p-6 sm:p-10 shadow-xl overflow-hidden text-card-foreground">
        {/* Background Watermark Logo */}
        <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none z-0 flex items-center justify-center">
          <Image
            src="/anambra_mot_logo.png"
            alt="Anambra State Watermark"
            width={350}
            height={350}
            className="opacity-[0.05] object-contain select-none"
          />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header with Accent Bar */}
          <div className="flex items-start gap-4">
            <div className="w-1.5 bg-primary rounded-full h-14 shrink-0 mt-0.5 shadow-sm" />
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Verify Motor Park Identity
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Enter the Park Name, ASIN, or Permit Number to retrieve compliance and registration records.
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              Motor Park Identifier (Name, ASIN, or Permit No.)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Central Motor Park, Awka or ASIN-12345678"
                  className="h-14 pl-12 pr-4 bg-background border-border rounded-xl text-base focus-visible:ring-primary focus-visible:border-primary shadow-inner w-full text-foreground"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-5 h-5" />
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>

          {/* Bottom links / actions inspired by inspo */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Official Anambra State Transport Verification Portal</span>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <span>View All Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {searched && (
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="text-center py-12 bg-card/50 rounded-2xl border border-border animate-pulse">
              <ShieldCheck className="w-10 h-10 text-primary mx-auto animate-bounce mb-3" />
              <p className="text-muted-foreground font-medium">Searching compliance database...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-center">
              <p className="font-semibold">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border shadow-sm p-6 text-card-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                No Verified Motor Parks Found
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                We could not find any active or approved motor parks matching <span className="font-mono font-semibold text-foreground">&quot;{query}&quot;</span>. Please check the spelling or try searching by town or LGA.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification Results ({results.length})
                </h3>
                <span className="text-xs text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  ✓ Verified by Ministry of Transport
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((park) => (
                  <div
                    key={park.id}
                    className="bg-card border-2 border-primary/30 hover:border-primary transition-all rounded-2xl p-6 shadow-md hover:shadow-lg relative overflow-hidden text-card-foreground"
                  >
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-none font-semibold text-xs">
                              {park.applicationStatus === "TEMPORAL_APPROVAL" ? "Temporary Approval Active" : "Approved Motor Park"}
                            </Badge>
                            {park.permitStatus && (
                              <Badge variant="outline" className="text-muted-foreground text-xs font-normal border-border">
                                Permit: {park.permitStatus}
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary shrink-0" />
                            <span>{park.businessName}</span>
                          </h2>
                          {park.transportCompanyName && (
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">
                              Operator: {park.transportCompanyName}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>
                              {park.streetAddress !== " " ? `${park.streetAddress}, ` : ""}
                              {park.townCity !== " " ? `${park.townCity}, ` : ""}
                              <span className="font-semibold text-foreground">{park.lga} LGA</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>
                              <span className="font-semibold text-foreground">{park.staffCount}</span> Verified Staff
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-xl p-4 border border-border/60 flex flex-col justify-center space-y-2 shrink-0 min-w-[220px]">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            ASIN Number
                          </span>
                          <span className="font-mono text-sm font-bold text-foreground">
                            {park.anssidNumber || "N/A"}
                          </span>
                        </div>
                        {park.permitNumber && (
                          <div className="pt-2 border-t border-border/60">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                              Permit Number
                            </span>
                            <span className="font-mono text-sm font-bold text-primary">
                              {park.permitNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
