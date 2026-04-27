/**
 * Payments Dashboard — Ministry of Transport Platform
 * STORY-065 | EPIC-004 | FR-042
 *
 * Finance Officer / Admin view of all payments.
 * Filters by status and entity type, paginated 20/page.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listPayments } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNaira as naira, fmtDate as fmt } from "@/lib/utils/format";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    entityType?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  try {
    await requireRole([
      "FINANCE_OFFICER",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "SYSTEM_ADMIN",
    ]);
  } catch {
    redirect("/dashboard");
  }

  const { page: pageStr, status, entityType } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));

  const result = await listPayments(page, status, entityType);
  const { payments, total } = result.success
    ? result.data!
    : { payments: [], total: 0 };

  const totalPages = Math.ceil(total / 20);

  const statusOptions = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "COMPLETED", label: "Completed" },
    { value: "FAILED", label: "Failed" },
    { value: "REFUNDED", label: "Refunded" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const entityOptions = [
    { value: "", label: "All Types" },
    { value: "MOTOR_PARK", label: "Motor Parks" },
    { value: "MASS_TRANSIT", label: "Mass Transit" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total transaction{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/payments/arrears">Arrears</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/payments/revenue">Revenue Report</Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Completed"
          value={String(
            payments.filter((p) => p.status === "COMPLETED").length,
          )}
          bg="bg-green-50 dark:bg-green-950/20"
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Pending"
          value={String(payments.filter((p) => p.status === "PENDING").length)}
          bg="bg-amber-50 dark:bg-amber-950/20"
        />
        <SummaryCard
          icon={<XCircle className="h-5 w-5 text-destructive" />}
          label="Failed"
          value={String(payments.filter((p) => p.status === "FAILED").length)}
          bg="bg-destructive/5"
        />
        <SummaryCard
          icon={<RefreshCw className="h-5 w-5 text-blue-600" />}
          label="Refunded"
          value={String(payments.filter((p) => p.status === "REFUNDED").length)}
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((opt) => (
          <Button
            key={opt.value}
            asChild
            size="sm"
            variant={
              status === opt.value || (!status && opt.value === "")
                ? "default"
                : "outline"
            }>
            <Link
              href={`/payments?status=${opt.value}&entityType=${entityType ?? ""}&page=1`}>
              {opt.label}
            </Link>
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        {entityOptions.map((opt) => (
          <Button
            key={opt.value}
            asChild
            size="sm"
            variant={
              entityType === opt.value || (!entityType && opt.value === "")
                ? "default"
                : "outline"
            }>
            <Link
              href={`/payments?status=${status ?? ""}&entityType=${opt.value}&page=1`}>
              {opt.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No payments found for the selected filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Page {page} of {totalPages || 1}
            </CardTitle>
            <CardDescription>
              Showing {payments.length} of {total}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Reference
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Payer
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/payments/${p.id}`}
                          className="font-mono text-xs text-primary hover:underline">
                          {p.paystackTransactionId
                            ? p.paystackTransactionId.slice(0, 20) + "…"
                            : p.id.slice(0, 12) + "…"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[160px]">
                            {p.payerEmail}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {p.payerAsinNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {p.paymentType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {naira(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {fmt(p.completedAt ?? p.initiatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {p.receiptNumber ? (
                          <Link
                            href={`/payments/${p.id}`}
                            className="text-xs font-mono text-primary hover:underline">
                            {p.receiptNumber}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link
              href={`/payments?status=${status ?? ""}&entityType=${entityType ?? ""}&page=${page - 1}`}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={page >= totalPages}>
            <Link
              href={`/payments?status=${status ?? ""}&entityType=${entityType ?? ""}&page=${page + 1}`}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border p-4 flex items-center gap-3 ${bg}`}>
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
