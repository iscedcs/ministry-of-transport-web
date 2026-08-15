/**
 * Staff Users — List Page — Ministry of Transport Platform
 * STORY-080 | EPIC-005 | FR-003
 *
 * Permanent Secretary / System Admin view of all Ministry staff accounts.
 * Allows deactivation and links to provision-new and edit pages.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, CheckCircle, XCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listStaffUsers } from "@/app/actions/admin";
import { toggleStaffActive } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fmtDate as fmtRaw } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/utils/labels";

function fmt(d: Date | null) {
  return fmtRaw(d, "Never");
}

export default async function StaffUsersPage() {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const result = await listStaffUsers();
  const users = result.success ? result.data! : [];

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link
              href="/admin"
              className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Staff & Users</span>
          </nav>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Staff Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Provision New Staff
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ministry Staff Directory</CardTitle>
          <CardDescription>
            All Ministry staff accounts. External applicants are not shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No staff accounts found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Designation
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Last Login
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {user.designation ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {fmt(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/users/${user.id}`}>Edit</Link>
                          </Button>
                          <ToggleActiveForm
                            userId={user.id}
                            isActive={user.isActive}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleActiveForm({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  async function toggle() {
    "use server";
    await toggleStaffActive(userId, !isActive);
  }
  return (
    <form action={toggle}>
      <Button
        type="submit"
        variant={isActive ? "ghost" : "outline"}
        size="sm"
        className={
          isActive
            ? "text-destructive hover:text-destructive"
            : "text-green-600"
        }>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}
