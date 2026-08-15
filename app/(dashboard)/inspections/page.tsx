/**
 * Inspections Queue Page — Ministry of Transport Platform
 * FR-011 | FR-023 | ROLES_AND_DUTIES.md (HOD — Review Reports, Inspection Queue)
 *
 * Central view of all inspections across Motor Parks and Mass Transit.
 *
 * - FIELD_INSPECTOR: sees only their assigned inspections
 * - HOD_* / Commissioner / PS / Admin: sees all inspections
 * - Each row links to the entity detail page where contextual actions live
 */

import type { InspectionListItem } from "@/app/actions/inspections";
import { listInspections } from "@/app/actions/inspections";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { requireRole, getSession } from "@/lib/auth";
import PsApprovalButton from "./ps-approval-button";
import { PAGE_SIZE } from "@/lib/consts";
import { fmtDate, fmtDateShort } from "@/lib/utils/format";
import Link from "next/link";
import { redirect } from "next/navigation";

// ── Page ────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    entityType?: string;
  }>;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING_PS_APPROVAL", label: "Pending PS Approval" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Report Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const ENTITY_FILTERS = [
  { value: "", label: "All Types" },
  { value: "MOTOR_PARK", label: "Motor Parks" },
  { value: "MASS_TRANSIT", label: "Mass Transit" },
];

const RECOMMENDATION_LABELS: Record<string, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  CONDITIONAL: "Conditional",
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  APPROVE: "text-[var(--success-text)]",
  REJECT: "text-[var(--error-text)]",
  CONDITIONAL: "text-[var(--warning-text)]",
};

export default async function InspectionsPage({ searchParams }: PageProps) {
  try {
    await requireRole([
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "SYSTEM_ADMIN",
      "ADMIN",
    ]);
  } catch {
    redirect("/dashboard");
  }

  const session = await getSession();
  const { page: pageStr, status, entityType } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));

  const result = await listInspections(
    page,
    status || undefined,
    entityType || undefined,
  );

  const { inspections, total } = result.success
    ? result.data!
    : { inspections: [] as InspectionListItem[], total: 0 };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (entityType) p.set("entityType", entityType);
    if (pageStr) p.set("page", pageStr);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/inspections?${p.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Inspections
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} inspection{total !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((opt) => {
            const active =
              (opt.value === "" && !status) || opt.value === status;
            return (
              <Link
                key={opt.value || "all"}
                href={filterUrl({
                  status: opt.value || undefined,
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

        {/* Entity type filter */}
        <div className="flex items-center gap-2">
          {ENTITY_FILTERS.map((opt) => {
            const active =
              (opt.value === "" && !entityType) || opt.value === entityType;
            return (
              <Link
                key={opt.value || "all-types"}
                href={filterUrl({
                  entityType: opt.value || undefined,
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

      {/* Table / Empty */}
      {inspections.length === 0 ? (
        <EmptyState
          title="No inspections found"
          message="Try adjusting your filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Entity
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell">
                  Inspector
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell">
                  Recommendation
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections.map((inspection) => (
                <tr
                  key={inspection.id}
                  className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {inspection.entityName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.linkedEntityType === "MOTOR_PARK"
                        ? "Motor Park"
                        : "Mass Transit"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    <span className="text-xs font-medium">
                      {inspection.inspectionType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                    {inspection.inspectorName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    <div>{fmtDateShort(inspection.scheduledDate)}</div>
                    {inspection.completedAt && (
                      <div className="text-[var(--success-text)]">
                        Done {fmtDate(inspection.completedAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={inspection.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {inspection.recommendedAction ? (
                      <span
                        className={`text-xs font-semibold ${RECOMMENDATION_COLORS[inspection.recommendedAction] ?? "text-muted-foreground"}`}>
                        {RECOMMENDATION_LABELS[inspection.recommendedAction] ??
                          inspection.recommendedAction}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end space-x-2">
                    {inspection.status === "PENDING_PS_APPROVAL" &&
                    (session?.role === "PERMANENT_SECRETARY" || session?.role === "SYSTEM_ADMIN") ? (
                      <PsApprovalButton inspectionId={inspection.id} />
                    ) : (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={inspection.entityHref}>View</Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={filterUrl({ page: String(page - 1) })}>
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
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
