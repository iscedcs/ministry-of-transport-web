import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { enforcementTypeLabel } from "@/lib/enforcement-type";
import {
  isEnforcementApprover,
  isEnforcementGrouper,
  isEnforcementViewer,
} from "@/lib/enforcement-roles";

export const metadata = {
  title: "Special Enforcement Unit | Ministry of Transport",
};

const PAGE_SIZE = 100;

const FILTERS: { key: string; label: string }[] = [
  { key: "PENDING", label: "Awaiting review" },
  { key: "APPROVED", label: "Approved" },
  { key: "UNGROUPED", label: "Approved, not grouped" },
  { key: "WAITLISTED", label: "Waitlisted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export default async function SpecialEnforcementAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isEnforcementViewer(session.role)) redirect("/dashboard");

  const canApprove = isEnforcementApprover(session.role);
  const canGroup = isEnforcementGrouper(session.role);

  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "PENDING";
  const q = (sp.q ?? "").trim();

  // Every viewer — both HODs, System Admin, Commissioner, PS, Admin — sees the
  // same applications; what differs is which actions they get.
  const statusWhere =
    filter === "PENDING"
      ? { status: { in: ["SUBMITTED", "UNDER_REVIEW"] as never[] } }
      : filter === "APPROVED"
        ? { status: "APPROVED" as never }
        : filter === "UNGROUPED"
          ? { status: "APPROVED" as never, groupId: null }
          : filter === "WAITLISTED"
            ? { status: "WAITLISTED" as never }
            : filter === "REJECTED"
              ? { status: "REJECTED" as never }
              : {};

  const searchWhere = q
    ? {
        OR: [
          { surname: { contains: q, mode: "insensitive" as const } },
          { firstName: { contains: q, mode: "insensitive" as const } },
          { nin: { contains: q } },
          { phoneNumber: { contains: q } },
          { lga: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = { ...statusWhere, ...searchWhere };

  const [applications, total, counts, groupCount] = await Promise.all([
    db.parkMonitorApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        surname: true,
        phoneNumber: true,
        lga: true,
        status: true,
        enforcementType: true,
        idCardIssued: true,
        createdAt: true,
        group: { select: { id: true, name: true } },
      },
    }),
    db.parkMonitorApplication.count({ where }),
    db.parkMonitorApplication.groupBy({ by: ["status"], _count: true }),
    db.enforcementGroup.count(),
  ]);

  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const awaiting = count("SUBMITTED") + count("UNDER_REVIEW");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Special Enforcement Unit
          </h1>
          <p className="text-sm text-muted-foreground">
            {canApprove
              ? "Review applications. Approving an application generates the applicant's ID card."
              : "Applications, ID cards and unit groups (view only)."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/park-monitors/groups">
            Unit groups ({groupCount})
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Awaiting review" value={awaiting} />
        <Summary label="Approved" value={count("APPROVED")} />
        <Summary label="Waitlisted" value={count("WAITLISTED")} />
        <Summary label="Groups" value={groupCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {canGroup
              ? "Use “Approved, not grouped” to find people to add to a unit group."
              : "All submitted applications."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/admin/park-monitors?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                {f.label}
              </Link>
            ))}
          </div>

          <form className="flex gap-2" action="/admin/park-monitors">
            <input type="hidden" name="filter" value={filter} />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search name, NIN, phone or LGA"
              className="max-w-sm"
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>LGA</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID card</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground">
                      No applications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium">
                          {app.firstName} {app.surname}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>{app.lga}</TableCell>
                      <TableCell className="text-xs">
                        {enforcementTypeLabel(app.enforcementType)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {app.group ? (
                          <Link
                            href={`/admin/park-monitors/groups/${app.group.id}`}
                            className="text-primary hover:underline">
                            {app.group.name}
                          </Link>
                        ) : app.status === "APPROVED" ? (
                          <span className="text-amber-600">Not grouped</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(app.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={app.status as never} />
                      </TableCell>
                      <TableCell>
                        {app.idCardIssued ? (
                          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
                            Issued
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/park-monitors/${app.id}`}>
                            {canApprove &&
                            (app.status === "SUBMITTED" ||
                              app.status === "UNDER_REVIEW")
                              ? "Review"
                              : "View Details"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {total > applications.length && (
            <p className="text-xs text-muted-foreground">
              Showing the latest {applications.length} of {total}. Narrow the
              search to see others.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
