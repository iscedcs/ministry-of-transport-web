/**
 * Dashboard Layout — Ministry of Transport Platform
 * Reference: docs/DESIGN_SYSTEM.md | docs/ROLES_AND_DUTIES.md
 *
 * Mobile: Responsive sidebar drawer + topbar
 * Desktop: Fixed sidebar (240px) + sticky topbar (64px) + scrollable main content.
 * Sidebar nav items are role-filtered — external applicants see a minimal set.
 * Active nav item is detected via the current pathname.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";
import { MobileMenuProvider } from "./mobile-menu-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <MobileMenuProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block w-60 flex-shrink-0" />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Topbar with mobile menu toggle */}
          <DashboardSidebar role={session.role} userId={session.userId} />
          <DashboardTopbar role={session.role} userId={session.userId} />

          {/* Main content - responsive padding */}
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
