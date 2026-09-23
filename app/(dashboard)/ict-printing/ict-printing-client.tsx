/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import {
  Printer,
  Search,
  IdCard,
  FileText,
  UserCheck,
  Ship,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Award,
  Clock,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import {
  getIctPrintingQueues,
  type PrintingQueue,
  type PrintingQueuesResult,
} from "@/app/actions/ict-printing";

export function IctPrintingClient({
  initialData,
}: {
  initialData: PrintingQueuesResult;
}) {
  /**
   * A TRACAS-scoped ICT officer only handles driver ID cards and letters of
   * authority; the park-staff and maritime queues are not theirs to print.
   * The server already withholds that data — this hides the empty controls.
   */
  const isTracasScoped = initialData.scope === "TRACAS";

  /**
   * The queue lives on the server now.
   *
   * It used to be fetched once, whole, capped at a hundred rows per queue and
   * then filtered in the browser. An officer searching for the four-hundredth
   * approved card was searching a hundred-row array that did not contain it,
   * and the badge told them the queue held a hundred items when it held far
   * more. Every change of tab, search or page now asks the database, which is
   * the only place that knows what is really waiting to be printed.
   */
  const [data, setData] = useState<PrintingQueuesResult>(initialData);
  const [pending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<PrintingQueue>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(
    (queue: PrintingQueue, search: string, page: number) => {
      startTransition(async () => {
        const next = await getIctPrintingQueues({ queue, search, page });
        if (next.success) setData(next);
      });
    },
    [],
  );

  // Typing waits a moment before it reaches the database. Without this every
  // keystroke would run ten counts and a page fetch.
  useEffect(() => {
    const handle = setTimeout(() => {
      load(activeTab, searchQuery, 1);
    }, 350);
    return () => clearTimeout(handle);
  }, [activeTab, searchQuery, load]);

  const selectTab = (queue: PrintingQueue) => setActiveTab(queue);

  const goToPage = (page: number) => load(activeTab, searchQuery, page);

  const currentItems = data.items;
  const firstOnPage = (data.page - 1) * data.pageSize + 1;
  const lastOnPage = Math.min(data.page * data.pageSize, data.total);

  const handlePrintWindow = (url: string) => {
    if (typeof window !== "undefined") {
      const win = window.open(url, "_blank");
      if (win) win.focus();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 rounded-3xl text-white shadow-xl border border-emerald-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
            <Printer className="w-3.5 h-3.5" />
            {isTracasScoped
              ? "TRACAS Dispatch Portal"
              : "ICT Officer Dispatch Portal"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isTracasScoped
              ? "TRACAS Printing Center"
              : "ICT Printing & Document Center"}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            {isTracasScoped
              ? "Print TRACAS documents: Commercial Driver ID Cards and Letters of Authority approved by the Ag. MD/CEO and the Commissioner."
              : "Manage, verify, and print official Ministry documents: Commercial Driver ID Cards, TRACAS Letters of Authority, Motor Park Staff Badges, Boat Permits, and Revalidation Letters."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-500/30 text-center">
            <span className="text-2xl font-extrabold text-emerald-400">
              {data.stats.totalToPrint}
            </span>
            <p className="text-[10px] uppercase font-bold text-emerald-200">
              Total Printable Items
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => selectTab("DRIVER_ID_CARD")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "DRIVER_ID_CARD"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <IdCard className="w-5 h-5 text-primary" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.driverIdCardsCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Driver ID Cards</p>
          <p className="text-xs text-muted-foreground">
            Commercial Driver Badges
          </p>
        </button>

        <button
          onClick={() => selectTab("LETTER_OF_AUTHORITY")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "LETTER_OF_AUTHORITY"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <FileText className="w-5 h-5 text-emerald-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.lettersCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Letters of Authority</p>
          <p className="text-xs text-muted-foreground">
            TRACAS Vehicle Authority
          </p>
        </button>

        {!isTracasScoped && (
        <button
          onClick={() => selectTab("PARK_STAFF_ID_CARD")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "PARK_STAFF_ID_CARD"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <UserCheck className="w-5 h-5 text-blue-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.parkStaffCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Park Staff Cards</p>
          <p className="text-xs text-muted-foreground">Park Monitor Badges</p>
        </button>
        )}

        {!isTracasScoped && (
        <button
          onClick={() => selectTab("BOAT_PERMIT")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "BOAT_PERMIT"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <Ship className="w-5 h-5 text-amber-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.boatPermitsCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Maritime Permits</p>
          <p className="text-xs text-muted-foreground">
            Boat Operating Permits
          </p>
        </button>
        )}

        {!isTracasScoped && (
        <button
          onClick={() => selectTab("REVALIDATION_CERTIFICATE")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "REVALIDATION_CERTIFICATE"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <FileCheck className="w-5 h-5 text-emerald-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.revalidationCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Revalidation Letters</p>
          <p className="text-xs text-muted-foreground">
            Approved Park Revalidations
          </p>
        </button>
        )}

        {!isTracasScoped && (
        <button
          onClick={() => selectTab("PARK_CERTIFICATE")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "PARK_CERTIFICATE"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <Award className="w-5 h-5 text-amber-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.parkCertificateCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Park Certificates</p>
          <p className="text-xs text-muted-foreground">
            Revalidation certificates for display
          </p>
        </button>
        )}

        {!isTracasScoped && (
        <button
          onClick={() => selectTab("TEMPORAL_APPROVAL")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "TEMPORAL_APPROVAL"
              ? "bg-primary/10 border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50"
          }`}>
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-orange-500" />
            <Badge variant="outline" className="font-bold text-xs">
              {data.stats.temporalCount}
            </Badge>
          </div>
          <p className="font-bold text-base mt-2">Temporary Approvals</p>
          <p className="text-xs text-muted-foreground">
            Motor parks operating temporarily
          </p>
        </button>
        )}
      </div>

      {/* Search and Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => selectTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            All Queues ({data.stats.totalToPrint})
          </button>
          <button
            onClick={() => selectTab("DRIVER_ID_CARD")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "DRIVER_ID_CARD"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            Driver Cards ({data.stats.driverIdCardsCount})
          </button>
          <button
            onClick={() => selectTab("LETTER_OF_AUTHORITY")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "LETTER_OF_AUTHORITY"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            Letters ({data.stats.lettersCount})
          </button>
          {!isTracasScoped && (
            <>
              <button
                onClick={() => selectTab("PARK_STAFF_ID_CARD")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "PARK_STAFF_ID_CARD"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Park Monitors ({data.stats.parkStaffCount})
              </button>
              <button
                onClick={() => selectTab("BOAT_PERMIT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "BOAT_PERMIT"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Boats ({data.stats.boatPermitsCount})
              </button>
              <button
                onClick={() => selectTab("REVALIDATION_CERTIFICATE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "REVALIDATION_CERTIFICATE"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Revalidation ({data.stats.revalidationCount})
              </button>
              <button
                onClick={() => selectTab("PARK_CERTIFICATE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "PARK_CERTIFICATE"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Certificates ({data.stats.parkCertificateCount})
              </button>
              <button
                onClick={() => selectTab("TEMPORAL_APPROVAL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "TEMPORAL_APPROVAL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Temporal ({data.stats.temporalCount})
              </button>
              <button
                onClick={() => selectTab("PARK_STAFF")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "PARK_STAFF"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Park Staff Cards ({data.stats.parkStaffCardCount})
              </button>
              <button
                onClick={() => selectTab("MASS_TRANSIT_LETTER")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "MASS_TRANSIT_LETTER"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                Mass Transit ({data.stats.massTransitCount})
              </button>
            </>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search every approved item by name, ref, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-muted/60 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* What is actually in this queue, and where we are in it */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {data.total > 0 ? (
            <>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {firstOnPage}-{lastOnPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {data.total}
              </span>{" "}
              {searchQuery.trim() ? "matching" : "approved"} item
              {data.total === 1 ? "" : "s"}
            </>
          ) : null}
          {pending && <span className="ml-2 opacity-70">Loading...</span>}
        </span>

        {data.totalPages > 1 && (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || data.page <= 1}
              onClick={() => goToPage(data.page - 1)}
              className="px-3 py-1.5 rounded-xl bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              Previous
            </button>
            <span className="font-semibold text-foreground">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={pending || data.page >= data.totalPages}
              onClick={() => goToPage(data.page + 1)}
              className="px-3 py-1.5 rounded-xl bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              Next
            </button>
          </span>
        )}
      </div>

      {/* Printing Items Grid / List */}
      {currentItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentItems.map((item) => (
            <div
              key={`${item.category}-${item.id}`}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    {item.category === "DRIVER_ID_CARD" && "🪪 Driver ID Card"}
                    {item.category === "LETTER_OF_AUTHORITY" &&
                      "📜 Letter of Authority"}
                    {item.category === "PARK_STAFF_ID_CARD" && "👮 Staff Badge"}
                    {item.category === "BOAT_PERMIT" && "🚤 Boat Permit"}
                  </Badge>
                  <span className="text-[11px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.status}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground text-sm flex-shrink-0">
                      {item.title[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-primary mt-1">
                      {item.refOrCode}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">
                  {item.issueDate
                    ? `Date: ${format(new Date(item.issueDate), "dd MMM yyyy")}`
                    : "Ready to Print"}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={item.printUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-xs hover:bg-primary/90 transition-colors text-xs">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
          <Filter className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="font-bold text-base">No Printable Items Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No document requests match your selected tab or search query (
            {searchQuery}).
          </p>
        </div>
      )}

      {data.totalPages > 1 && currentItems.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <button
            type="button"
            disabled={pending || data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
            className="px-4 py-2 rounded-xl bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            Previous
          </button>
          <span className="px-2 font-semibold text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={pending || data.page >= data.totalPages}
            onClick={() => goToPage(data.page + 1)}
            className="px-4 py-2 rounded-xl bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
