import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { massTransitSignal } from "@/lib/mass-transit-signal";
import { getSession } from "@/lib/auth";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { CheckSquare, Building2, Search, Bus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { QueueFilters } from "./queue-filters";

const PER_PAGE = 25;

/**
 * The LGA dropdown scans every application to build a list that changes only
 * when a park in a brand-new LGA is added — roughly never. Caching it for five
 * minutes removes one full-table aggregate from every page view, including
 * every pagination click.
 *
 * Only used for the unscoped view; an inspector's list is scoped to their own
 * assignments and is small enough to query directly.
 */
const getCachedLgaCounts = unstable_cache(
  async () =>
    db.revalidationApplication.groupBy({ by: ["lga"], _count: true }),
  ["revalidation-lga-counts"],
  { revalidate: 300, tags: ["revalidation-lgas"] },
);

/** Groups the workflow's many statuses into the tabs staff actually think in. */
const STATUS_TABS: { value: string; label: string; match: string[] }[] = [
  { value: "", label: "All", match: [] },
  { value: "MASS_TRANSIT", label: "Mass Transit", match: [] },
  { value: "SUBMITTED", label: "Awaiting review", match: ["SUBMITTED", "UNDER_REVIEW"] },
  {
    value: "INSPECTION",
    label: "Inspection",
    match: [
      "PENDING_PS_INSPECTION_APPROVAL",
      "INSPECTION_SCHEDULED",
      "INSPECTION_IN_PROGRESS",
    ],
  },
  {
    value: "APPROVALS",
    label: "In approval",
    match: [
      "INSPECTION_COMPLETED",
      "PENDING_HOD_APPROVAL",
      "PENDING_PS_APPROVAL",
      "PENDING_COMMISSIONER_APPROVAL",
    ],
  },
  { value: "APPROVED", label: "Approved", match: ["APPROVED"] },
  { value: "REJECTED", label: "Rejected", match: ["REJECTED", "REVOKED"] },
];

function getClaimedFacilitiesCount(facilitiesJson: unknown): number {
  if (!facilitiesJson) return 0;
  try {
    const obj =
      typeof facilitiesJson === "string"
        ? JSON.parse(facilitiesJson)
        : facilitiesJson;
    if (Array.isArray(obj)) return obj.length;
    return Object.values(obj || {}).filter(Boolean).length;
  } catch {
    return 0;
  }
}

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    lga?: string;
    page?: string;
  }>;
}

export default async function RevalidationQueuePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedRoles = [
    "HOD_PARKS_REVALIDATION",
    "HOD_TRANSPORT_OPS",
    "HOD_VIS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
    "ADMIN",
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER",
    "ENUMERATOR",
  ];
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const isMassTransitTab = sp.status === "MASS_TRANSIT";
  const statusTab = STATUS_TABS.find((t) => t.value && t.value === sp.status);
  const lga = (sp.lga ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // Inspectors only ever see their own assignments.
  const isInspector =
    session.role === "FIELD_INSPECTOR" ||
    session.role === "VEHICLE_INSPECTION_OFFICER";

  const where: Prisma.RevalidationApplicationWhereInput = {
    ...(isInspector
      ? { inspectionTeam: { some: { userId: session.userId } } }
      : {}),
    ...(isMassTransitTab
      ? { serviceCategory: "MASS_TRANSIT" }
      : statusTab && statusTab.match.length > 0
        ? { status: { in: statusTab.match as Prisma.EnumApplicationStatusFilter["in"] } }
        : {}),
    ...(lga ? { lga } : {}),
    ...(q
      ? {
          OR: [
            { parkName: { contains: q, mode: "insensitive" } },
            { ownerName: { contains: q, mode: "insensitive" } },
            { townCommunity: { contains: q, mode: "insensitive" } },
            { phoneNumber: { contains: q } },
            { asinNumber: { contains: q } },
            { revalidationNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const filtered = Boolean(q || statusTab || lga);

  // Tab counts respect the search and LGA filters but not the status filter —
  // otherwise every tab but the active one would read zero.
  const countScope: Prisma.RevalidationApplicationWhereInput = {
    ...where,
    status: undefined,
    serviceCategory: undefined,
  };

  const [applications, total, statusGroups, lgaGroups, massTransitTotal, filteredTotal] =
    await Promise.all([
    db.revalidationApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        massTransitCompany: {
          select: {
            id: true,
            currentFleetSize: true,
            _count: { select: { vehicles: true } },
          },
        },
      },
    }),
    db.revalidationApplication.count({ where }),
    db.revalidationApplication.groupBy({
      by: ["status"],
      _count: true,
      where: countScope,
    }),
    isInspector
      ? db.revalidationApplication.groupBy({
          by: ["lga"],
          _count: true,
          where: { inspectionTeam: { some: { userId: session.userId } } },
        })
      : getCachedLgaCounts(),
    db.revalidationApplication.count({
      where: { ...countScope, serviceCategory: "MASS_TRANSIT" },
    }),
    // Only needed to render "showing X of Y". With no filters applied, Y is X.
    filtered
      ? db.revalidationApplication.count({
          where: isInspector
            ? { inspectionTeam: { some: { userId: session.userId } } }
            : {},
        })
      : Promise.resolve(null),
  ]);

  const countFor = (match: string[]) =>
    match.length === 0
      ? statusGroups.reduce((n, g) => n + g._count, 0)
      : statusGroups
          .filter((g) => match.includes(g.status))
          .reduce((n, g) => n + g._count, 0);

  const statuses = STATUS_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    count: t.value === "MASS_TRANSIT" ? massTransitTotal : countFor(t.match),
  }));

  const lgas = lgaGroups
    .filter((g): g is typeof g & { lga: string } => Boolean(g.lga))
    .map((g) => ({ value: g.lga, count: g._count }))
    .sort((a, b) => b.count - a.count);

  const grandTotal = filteredTotal ?? total;
  const totalPages = Math.ceil(total / PER_PAGE);

  const carry: Record<string, string> = {};
  if (q) carry.q = q;
  if (sp.status) carry.status = sp.status;
  if (lga) carry.lga = lga;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Revalidation Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, compare, and process park and facility revalidation
            applications.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center bg-muted/60 px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground">
          <span>
            {filtered ? (
              <>
                Showing <strong className="text-foreground">{total}</strong> of{" "}
                {grandTotal}
              </>
            ) : (
              <>
                Total Submissions:{" "}
                <strong className="text-foreground">{grandTotal}</strong>
              </>
            )}
          </span>
        </div>
      </div>

      <QueueFilters statuses={statuses} lgas={lgas} />

      <div className="grid gap-4">
        {applications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
            {filtered ? (
              <>
                <Search className="w-8 h-8 text-muted-foreground mb-3" />
                <CardTitle className="text-lg mb-2">No matches</CardTitle>
                <CardDescription>
                  No application matches those filters. Try a different search
                  term, or clear the filters to see all {grandTotal}.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-lg mb-2">No Applications</CardTitle>
                <CardDescription>
                  There are currently no revalidation applications in the queue.
                </CardDescription>
              </>
            )}
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-xs bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/80 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">Date</th>
                    <th className="py-3.5 px-4">Applicant / Owner</th>
                    <th className="py-3.5 px-4">Park Name</th>
                    <th className="py-3.5 px-4">Facility Type</th>
                    <th className="py-3.5 px-4 text-center">
                      Facilities Claimed
                    </th>
                    <th className="py-3.5 px-4">LGA</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {applications.map((app) => {
                    const claimedCount = getClaimedFacilitiesCount(
                      app.facilitiesAvailable,
                    );
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-muted/40 transition-colors group">
                        <td className="py-4 pl-6 pr-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {app.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 px-4 font-semibold text-foreground">
                          {app.ownerName}
                          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                            {app.phoneNumber ?? "No phone on file"}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />{" "}
                            {app.parkName}
                          </span>
                          {/* So a search result says which register it belongs
                              to without opening it. */}
                          {app.serviceCategory === "MASS_TRANSIT" ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                              <Bus className="w-3 h-3" /> Mass Transit • {app.massTransitCompany?._count?.vehicles ?? app.massTransitCompany?.currentFleetSize ?? 0} vehicles
                            </span>
                          ) : !app.serviceCategory &&
                            app.dataSource === "VENDOR_IMPORT" &&
                            massTransitSignal(app) ? (
                            <span className="mt-1 inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              Possibly mass transit
                            </span>
                          ) : null}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {app.facilityType ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border">
                              {app.facilityType}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not stated
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <CheckSquare className="w-3.5 h-3.5" />{" "}
                            {claimedCount} Available
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground font-medium">
                          {app.lga ?? "—"}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusPill
                            status={
                              app.status as Parameters<
                                typeof StatusPill
                              >[0]["status"]
                            }
                          />
                        </td>
                        <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {app.serviceCategory === "MASS_TRANSIT" && (
                              <Link
                                href={`/admin/revalidation-queue/${app.id}#fleet`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-600 hover:text-white font-medium text-xs transition-all shadow-2xs">
                                <Bus className="w-3.5 h-3.5" />
                                Fleet ({app.massTransitCompany?._count?.vehicles ?? app.massTransitCompany?.currentFleetSize ?? 0})
                              </Link>
                            )}
                            <Link
                              href={`/admin/revalidation-queue/${app.id}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-xs transition-all shadow-2xs">
                              Compare &amp; Review
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · showing{" "}
              {(page - 1) * PER_PAGE + 1}–
              {Math.min(page * PER_PAGE, total)} of {total}
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              baseUrl="/admin/revalidation-queue"
              searchParams={carry}
            />
          </div>
        )}
      </div>
    </div>
  );
}
