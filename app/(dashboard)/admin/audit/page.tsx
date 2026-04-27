/**
 * Audit Trail Viewer — Ministry of Transport Platform
 * STORY-088 | EPIC-005 | FR-004
 *
 * Paginated view of all system audit log entries.
 * Filterable by entity type and action.
 * Access: COMMISSIONER, PERMANENT_SECRETARY, SYSTEM_ADMIN
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listAuditLogs } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { fmtDateTimeShort as fmt } from "@/lib/utils/format";
import { getActionBadgeClass as actionBadgeClass } from "@/lib/utils/labels";

const ENTITY_TYPES = [
  "User",
  "MotorPark",
  "MassTransitCompany",
  "Payment",
  "FeeSchedule",
  "SystemConfiguration",
  "Inspection",
];

const ACTION_PREFIXES = [
  "STAFF_ACCOUNT",
  "FEE_SCHEDULE",
  "SYSTEM_CONFIG",
  "PAYMENT",
  "MOTOR_PARK",
  "TRANSIT",
  "INSPECTION",
  "PERMIT",
  "REVOKE",
];

interface PageProps {
  searchParams: Promise<{
    page?: string;
    entityType?: string;
    action?: string;
  }>;
}

export default async function AuditTrailPage({ searchParams }: PageProps) {
  try {
    await requireRole(["COMMISSIONER", "PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const entityType = sp.entityType ?? "";
  const action = sp.action ?? "";

  const result = await listAuditLogs(
    page,
    entityType || undefined,
    action || undefined,
  );
  const { logs = [], total = 0 } = result.success ? result.data! : {};
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const extraSearchParams: Record<string, string> = {};
  if (entityType) extraSearchParams.entityType = entityType;
  if (action) extraSearchParams.action = action;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-foreground">Audit Trail</span>
        </nav>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}>
          Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total.toLocaleString()} log entries
        </p>
      </div>

      {/* Filters */}
      <form method="get" action="/admin/audit" className="flex flex-wrap gap-3">
        <select
          name="entityType"
          defaultValue={entityType}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          name="action"
          defaultValue={action}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All actions</option>
          {ACTION_PREFIXES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
        {(entityType || action) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/audit">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Log Entries</CardTitle>
          <CardDescription>
            All actions performed by Ministry staff, ordered by most recent
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No audit log entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Entity
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Performed By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeClass(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium">{log.entityType}</span>
                        <p className="text-muted-foreground font-mono text-[10px] truncate max-w-[100px]">
                          {log.entityId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {log.changeDescription ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium">
                          {log.performer.firstName} {log.performer.lastName}
                        </p>
                        <p className="text-muted-foreground">
                          {log.performer.email}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          baseUrl="/admin/audit"
          searchParams={extraSearchParams}
        />
      )}
    </div>
  );
}
