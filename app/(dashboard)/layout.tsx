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
import { db } from "@/lib/db";
import { getTextSetting } from "@/lib/system-config";
import { CVR_BASE_WRITE_ROLES } from "@/lib/cvr-roles";
import type { UserRole } from "@prisma/client";
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

  // Fetch registeredService for applicants (not stored in session)
  let registeredService: string | null = null;
  if (session.role === "EXTERNAL_APPLICANT") {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { registeredService: true },
    });
    registeredService = user?.registeredService ?? null;
  }

  // Resolve effective CVR-accessible roles for sidebar visibility.
  // Extra roles are configured by System Admin via /admin/config without code changes.
  const cvrExtraRaw = await getTextSetting("cvr.access.extraRoles").catch(() => "");
  const ALL_ROLE_VALUES = new Set<string>([
    "COMMISSIONER","PERMANENT_SECRETARY","HOD_PARKS","HOD_VIS","HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION","FIELD_INSPECTOR","FINANCE_OFFICER","VEHICLE_INSPECTION_OFFICER",
    "EXTERNAL_APPLICANT","PARK_MONITOR","SYSTEM_ADMIN","ADMIN","ICT_OFFICER",
    "ICT_OFFICER_TRACAS","ENUMERATOR","TRACAS_MD",
  ]);
  const extraRoles = cvrExtraRaw
    .split(",")
    .map((r) => r.trim())
    .filter((r) => ALL_ROLE_VALUES.has(r)) as UserRole[];
  const cvrAllowedRoles: UserRole[] = Array.from(new Set([...CVR_BASE_WRITE_ROLES, ...extraRoles]));

  return (
    <MobileMenuProvider>
      <div className="flex min-h-dvh bg-background">
        {/* Sidebar — flex sibling so it occupies its own column */}
        <div className="print:hidden sticky top-0 h-dvh shrink-0 z-40">
          <DashboardSidebar
            role={session.role}
            userId={session.userId}
            registeredService={registeredService}
            cvrAllowedRoles={cvrAllowedRoles}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="print:hidden sticky top-0 z-30">
            <DashboardTopbar role={session.role} userId={session.userId} />
          </div>

          {/* Main content - responsive padding */}
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-6 print:p-0 print:overflow-visible print:bg-white print:h-auto">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
