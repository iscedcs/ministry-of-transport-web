/**
 * Motor Parks List Page — Ministry of Transport Platform
 * STORY-020 / STORY-033
 *
 * Staff: full queue with status/search filters
 * Applicant: own applications only
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listMotorParks } from "@/app/actions/motor-park";
import type { MotorParkListItem } from "@/app/actions/motor-park";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { APPLICATION_STATUS_OPTIONS as STATUS_OPTIONS } from "@/lib/utils/labels";
import { fmtDateShort as formatDate } from "@/lib/utils/format";

// ── Page ────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function MotorParksPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const status =
    params.status && params.status !== "ALL" ? params.status : undefined;
  const search = params.search ?? undefined;
  const page = Number(params.page ?? 1);

  const result = await listMotorParks({ status, search, page, limit: 20 });
  const parks: MotorParkListItem[] = result.success ? result.data!.parks : [];
  const total = result.success ? result.data!.total : 0;
  const isApplicant = session.role === "EXTERNAL_APPLICANT";
  // An Enumerator captures in the field. Same form, saved as a draft owned by
  // nobody — without this button they had no way to start one.
  const isEnumerator = session.role === "ENUMERATOR";

  // Build filter URL helper
  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (params.status) p.set("status", params.status);
    if (params.search) p.set("search", params.search);
    if (params.page) p.set("page", params.page);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/motor-parks?${p.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            Motor Parks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isApplicant
              ? "Your submitted motor park applications."
              : `${total} application${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        {(isApplicant || isEnumerator) && (
          <Button asChild>
            <Link href="/motor-parks/apply">New Application</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const active =
              (opt.value === "ALL" && !status) || opt.value === status;
            return (
              <Link
                key={opt.value}
                href={filterUrl({
                  status: opt.value === "ALL" ? undefined : opt.value,
                  page: "1",
                })}
                className={
                  active
                    ? "px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    : "px-3 py-1 rounded-full text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-colors"
                }>
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {parks.length === 0 ? (
        <EmptyState
          title={isApplicant ? "No applications yet" : "No parks found"}
          message={
            isApplicant
              ? "Submit your first motor park application to get started."
              : "Try adjusting your filters."
          }
          action={
            isApplicant ? (
              <Button asChild>
                <Link href="/motor-parks/apply">Submit Application</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Park / Business
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">
                  Location
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell">
                  Applied
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parks.map((park) => {
                const hasPendingPayment = park.fees && park.fees.length > 0;
                return (
                  <tr
                    key={park.id}
                    className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {park.businessName}
                          </p>
                          {park.transportCompanyName && (
                            <p className="text-xs text-muted-foreground">
                              {park.transportCompanyName}
                            </p>
                          )}
                        </div>
                        {hasPendingPayment && (
                          <StatusPill
                            status="PENDING_PAYMENT"
                            className="text-xs"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[180px] truncate">
                      {park.locationAddress}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={
                          park.applicationStatus as Parameters<
                            typeof StatusPill
                          >[0]["status"]
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {formatDate(park.appliedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/motor-parks/${park.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 20 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{" "}
                {total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={filterUrl({ page: String(page - 1) })}>
                      Previous
                    </Link>
                  </Button>
                )}
                {page * 20 < total && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={filterUrl({ page: String(page + 1) })}>
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
