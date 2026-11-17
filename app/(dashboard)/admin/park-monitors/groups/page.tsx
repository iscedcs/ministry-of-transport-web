import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  ENFORCEMENT_GROUP_MIN_MEMBERS,
  ENFORCEMENT_TYPES,
  enforcementTypeLabel,
} from "@/lib/enforcement-type";
import {
  isEnforcementGrouper,
  isEnforcementViewer,
} from "@/lib/enforcement-roles";

export const metadata = {
  title: "Unit Groups | Special Enforcement Unit",
};

export default async function EnforcementGroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isEnforcementViewer(session.role)) redirect("/dashboard");
  const canGroup = isEnforcementGrouper(session.role);

  const [groups, ungrouped] = await Promise.all([
    db.enforcementGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    db.parkMonitorApplication.count({
      where: { status: "APPROVED", groupId: null },
    }),
  ]);

  const leaderIds = groups
    .map((g) => g.leaderApplicationId)
    .filter((v): v is string => !!v);
  const leaders = leaderIds.length
    ? await db.parkMonitorApplication.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, firstName: true, surname: true },
      })
    : [];
  const leaderName = (id: string | null) => {
    const l = leaders.find((x) => x.id === id);
    return l ? `${l.firstName} ${l.surname}` : "—";
  };

  const canCreate = canGroup && ungrouped >= ENFORCEMENT_GROUP_MIN_MEMBERS;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link
        href="/admin/park-monitors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unit groups</h1>
          <p className="text-sm text-muted-foreground">
            Approved members are organised into groups of at least{" "}
            {ENFORCEMENT_GROUP_MIN_MEMBERS}, within the{" "}
            {ENFORCEMENT_TYPES.map((t) => t.label).join(", ")}.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/admin/park-monitors/groups/new">Create group</Link>
          </Button>
        )}
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm">
        <span className="font-semibold">{ungrouped}</span> approved{" "}
        {ungrouped === 1 ? "person is" : "people are"} not in a group yet.
        {canGroup && ungrouped < ENFORCEMENT_GROUP_MIN_MEMBERS && (
          <span className="text-muted-foreground">
            {" "}
            A new group needs {ENFORCEMENT_GROUP_MIN_MEMBERS}.
          </span>
        )}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>{groups.length} in total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Team leader</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground">
                      No groups yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{enforcementTypeLabel(g.unit)}</TableCell>
                      <TableCell>{g.area}</TableCell>
                      <TableCell>{leaderName(g.leaderApplicationId)}</TableCell>
                      <TableCell>{g._count.members}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/park-monitors/groups/${g.id}`}>
                            {canGroup ? "Manage" : "View"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
