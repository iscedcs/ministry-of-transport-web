/**
 * Dashboard Sidebar — Mobile responsive navigation
 * Shows as fixed sidebar on desktop (md+), drawer on mobile
 * 
 * Navigation items are shown/hidden based on the user's role.
 * Active item detected via usePathname().
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ROLE_LABELS } from "@/lib/utils/labels";
import { useMobileMenu } from "./mobile-menu-context";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// ─── Nav item definition ─────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji — swapped out for SVG icons in Phase 2
  allowedRoles: UserRole[] | "ALL"; // "ALL" = visible to everyone
}

const NAV_ITEMS: NavItem[] = [
  // ── Universal ──
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    allowedRoles: "ALL",
  },

  // ── Motor Park Module ──
  {
    label: "Motor Parks",
    href: "/motor-parks",
    icon: "🏗️",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "FINANCE_OFFICER",
      "EXTERNAL_APPLICANT",
      "SYSTEM_ADMIN",
    ],
  },

  // ── Mass Transit Module (EPIC-003, future) ──
  {
    label: "Mass Transit",
    href: "/fleet-operators",
    icon: "🚌",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "FINANCE_OFFICER",
      "EXTERNAL_APPLICANT",
      "SYSTEM_ADMIN",
    ],
  },

  // ── Revenue (EPIC-004, future) ──
  {
    label: "Payments",
    href: "/payments",
    icon: "💳",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "FINANCE_OFFICER",
      "SYSTEM_ADMIN",
    ],
  },

  // ── Inspections queue ──
  {
    label: "Inspections",
    href: "/inspections",
    icon: "🔍",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "SYSTEM_ADMIN",
    ],
  },

  // ── AVIR (EPIC-006, future) ──
  {
    label: "AVIR Reports",
    href: "/avir",
    icon: "🚨",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "VEHICLE_INSPECTION_OFFICER",
      "SYSTEM_ADMIN",
    ],
  },

  // ── Admin ──
  {
    label: "Staff & Users",
    href: "/admin/users",
    icon: "👥",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
  {
    label: "Audit Trail",
    href: "/admin/audit",
    icon: "📋",
    allowedRoles: ["COMMISSIONER", "PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
  {
    label: "Fee Schedule",
    href: "/admin/fees",
    icon: "💰",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
  {
    label: "Checklists",
    href: "/admin/checklists",
    icon: "✅",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
  {
    label: "System Config",
    href: "/admin/config",
    icon: "⚙️",
    allowedRoles: ["SYSTEM_ADMIN"],
  },
  {
    label: "Monitoring",
    href: "/admin/monitoring",
    icon: "📡",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
  {
    label: "Data Export",
    href: "/admin/export",
    icon: "📤",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
];

// ─── Navigation Content (reusable for both desktop & mobile) ─────────────────

function SidebarNavContent({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { close } = useMobileMenu();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.allowedRoles === "ALL" || item.allowedRoles.includes(role),
  );

  return (
    <>
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Image
            width={100}
            height={100}
            src="/anambra_mot_logo.png"
            alt=""
            quality={100}
            priority
            className="w-10 h-10"
          />

          <div>
            <p
              className="font-bold text-sm text-foreground leading-tight"
              style={{ fontFamily: "var(--font-display)" }}>
              MOT Platform
            </p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="p-3 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}>
                  <span aria-hidden="true" className="text-base leading-none">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: version */}
      <div className="px-5 py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          ISCE Digital Concept · v0.1
        </p>
      </div>
    </>
  );
}

// ─── Desktop Sidebar (always visible on md+) ─────────────────────────────────

function DesktopSidebar({ role }: { role: UserRole }) {
  return (
    <aside className="hidden md:flex w-60 h-full bg-card border-r border-border/50 flex-col overflow-hidden shrink-0 fixed left-0 top-0 bottom-0 z-40">
      <SidebarNavContent role={role} />
    </aside>
  );
}

// ─── Mobile Sidebar (drawer on mobile) ───────────────────────────────────────

function MobileSidebar({ role }: { role: UserRole }) {
  const { isOpen, close } = useMobileMenu();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetTitle>Navigation Menu</SheetTitle>
      <SheetContent side="left" className="w-60 p-0">
        <div className="flex flex-col h-full overflow-hidden">
          <SidebarNavContent role={role} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Combined Sidebar Export ──────────────────────────────────────────────────

export function DashboardSidebar({ role }: { role: UserRole; userId: string }) {
  return (
    <>
      <DesktopSidebar role={role} />
      <MobileSidebar role={role} />
    </>
  );
}
