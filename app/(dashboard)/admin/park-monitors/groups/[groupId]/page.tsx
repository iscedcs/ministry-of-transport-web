import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
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
  ENFORCEMENT_GROUP_MIN_MEMBERS,
  enforcementTypeLabel,
} from "@/lib/enforcement-type";
import {
  isEnforcementGrouper,
  isEnforcementViewer,
} from "@/lib/enforcement-roles";
import { GroupManager } from "./group-manager";

export const metadata = {
  title: "Group | Special Enforcement Unit",
};

export default async function EnforcementGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (!isEnforcementViewer(session.role)) redirect("/dashboard");
  const canGroup = isEnforcementGrouper(session.role);

  const group = await db.enforcementGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: [{ surname: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          surname: true,
          lga: true,
          phoneNumber: true,
        },
      },
    },
  });
  if (!group) notFound();

  const eligible = canGroup
    ? await db.parkMonitorApplication.findMany({
        where: { status: "APPROVED", groupId: null },
        orderBy: [{ surname: "asc" }, { firstName: "asc" }],
        take: 1000,
        select: { id: true, firstName: true, surname: true, lga: true },
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/park-monitors/groups"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Unit groups
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
        <p className="text-sm text-muted-foreground">
          {enforcementTypeLabel(group.unit)} · {group.area} ·{" "}
          {group.members.length} members (minimum {ENFORCEMENT_GROUP_MIN_MEMBERS})
        </p>
      </div>

      {canGroup ? (
        <GroupManager
          group={{
            id: group.id,
            name: group.name,
            area: group.area,
            unit: group.unit,
            leaderApplicationId: group.leaderApplicationId,
          }}
          members={group.members}
          eligible={eligible}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>View only</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <Link
                  href={`/admin/park-monitors/${m.id}`}
                  className="font-medium hover:underline">
                  {m.firstName} {m.surname}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {group.leaderApplicationId === m.id ? "Team leader · " : ""}
                  {m.lga}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
