/**
 * Fleet Operators List Page — Ministry of Transport Platform
 * STORY-051 | FR-020 through FR-027
 *
 * Staff: full queue with status/search filters
 * Applicant: own fleet applications only
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  listFleetApplications,
  type FleetApplicationListItem,
} from "@/app/actions/mass-transit";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { APPLICATION_STATUS_OPTIONS as STATUS_OPTIONS } from "@/lib/utils/labels";
import { fmtDateShort as formatDate } from "@/lib/utils/format";

// ── Page ────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function FleetOperatorsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const status =
    params.status && params.status !== "ALL" ? params.status : undefined;
  const search = params.search ?? undefined;
  const page = Number(params.page ?? 1);

  const result = await listFleetApplications({
    status,
    search,
    page,
    limit: 20,
  });
  const companies: FleetApplicationListItem[] = result.success
    ? result.data!.companies
    : [];
  const total = result.success ? result.data!.total : 0;
  const isApplicant = session.role === "EXTERNAL_APPLICANT";

  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (params.status) p.set("status", params.status);
    if (params.search) p.set("search", params.search);
    if (params.page) p.set("page", params.page);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/fleet-operators?${p.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isApplicant ? "My Fleet Applications" : "Fleet Operators"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isApplicant
              ? "Track your mass transit registration applications"
              : "Mass transit company & fleet operator registrations"}
          </p>
        </div>
        {isApplicant && (
          <Button asChild>
            <Link href="/fleet-operators/apply">+ New Application</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="search"
          type="text"
          placeholder="Search company or CAC number…"
          defaultValue={params.search ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-48 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          name="status"
          defaultValue={params.status ?? "ALL"}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
        {(params.status || params.search) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/fleet-operators">Clear</Link>
          </Button>
        )}
      </form>

      {/* Results summary */}
      {total > 0 && (
        <p className="text-sm text-muted-foreground -mt-2">
          {total} application{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Table */}
      {companies.length === 0 ? (
        <EmptyState
          title={
            isApplicant ? "No applications yet" : "No fleet operators found"
          }
          message={
            isApplicant
              ? "Submit your first fleet registration application to get started."
              : "No fleet operator applications match the current filters."
          }
          action={
            isApplicant ? (
              <Button asChild>
                <Link href="/fleet-operators/apply">Apply Now</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Company
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Contact
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  Fleet Size
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Applied
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Permit Expires
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((co, i) => (
                <tr
                  key={co.id}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {co.companyName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {co.contactPerson}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {co.contactPhone}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {co.currentFleetSize}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={co.applicationStatus} />
                    {co.permitStatus && co.permitStatus !== "ACTIVE" && (
                      <StatusPill status={co.permitStatus} className="ml-1" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {formatDate(co.appliedAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {formatDate(co.permitExpiresAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/fleet-operators/${co.id}`}>View →</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={filterUrl({ page: String(page - 1) })}>
                  ← Previous
                </Link>
              </Button>
            )}
            {page < Math.ceil(total / 20) && (
              <Button asChild variant="outline" size="sm">
                <Link href={filterUrl({ page: String(page + 1) })}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
