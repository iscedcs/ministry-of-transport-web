/**
 * Dashboard Layout — Ministry of Transport Platform
 * Reference: docs/DESIGN_SYSTEM.md | docs/ROLES_AND_DUTIES.md
 *
 * Shell: fixed sidebar (260px) + sticky topbar (64px) + scrollable main content.
 * Sidebar nav items are role-filtered — external applicants see a minimal set.
 * Active nav item is detected via the current pathname.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar role={session.role} userId={session.userId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardTopbar role={session.role} userId={session.userId} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
