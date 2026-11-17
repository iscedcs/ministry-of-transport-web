import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isEnforcementGrouper } from "@/lib/enforcement-roles";
import { CreateGroupForm } from "./create-group-form";

export const metadata = {
  title: "Create Group | Special Enforcement Unit",
};

export default async function NewEnforcementGroupPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isEnforcementGrouper(session.role)) {
    redirect("/admin/park-monitors/groups");
  }

  const eligible = await db.parkMonitorApplication.findMany({
    where: { status: "APPROVED", groupId: null },
    orderBy: [{ surname: "asc" }, { firstName: "asc" }],
    take: 1000,
    select: {
      id: true,
      firstName: true,
      surname: true,
      lga: true,
      enforcementType: true,
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/park-monitors/groups"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Unit groups
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a group</h1>
        <p className="text-sm text-muted-foreground">
          Choose the unit, name the group, then pick its members and team leader.
        </p>
      </div>
      <CreateGroupForm eligible={eligible} />
    </div>
  );
}
