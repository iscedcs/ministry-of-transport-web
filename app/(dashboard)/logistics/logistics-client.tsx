"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Truck, Building2, User, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/badge";
import type { LogisticsListItem } from "@/app/actions/logistics";
import type { ApplicationStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "SUBMITTED", label: "Awaiting HOD Ops" },
  { value: "PENDING_PS_APPROVAL", label: "Awaiting PS" },
  { value: "PENDING_COMMISSIONER_APPROVAL", label: "Awaiting Commissioner" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function LogisticsClient({
  applicants,
  stats,
  pagination,
  statusFilter,
  searchQuery,
  canWrite,
}: {
  applicants: LogisticsListItem[];
  stats: { total: number; approved: number; pending: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  statusFilter?: ApplicationStatus;
  searchQuery: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchQuery);

  const setParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`/logistics?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Logistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logistics companies and individual operators — delivery and courier vehicles.
          </p>
        </div>
        {canWrite && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/logistics/register">
              <Plus className="h-4 w-4" />
              Register
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Approved
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.approved}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              In the chain
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setParam("q", q)}
                placeholder="Search company, contact, plate or reference..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setParam("q", q)}>
              Search
            </Button>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value || "ALL"}
                  type="button"
                  onClick={() => setParam("status", s.value || undefined)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    (statusFilter ?? "") === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {applicants.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No logistics applicants found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      Phone
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Vehicles
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      Reference
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`cursor-pointer hover:bg-secondary/40 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                      onClick={() => router.push(`/logistics/${a.id}`)}>
                      <td className="px-4 py-2.5 flex items-center gap-1.5">
                        {a.applicantType === "COMPANY" ? (
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        {a.name}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{a.contactPhone}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          {a.vehicleCount}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs hidden md:table-cell">
                        {a.permitNumber ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setParam("page", String(pagination.page - 1))}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setParam("page", String(pagination.page + 1))}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
