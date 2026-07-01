"use client";

/**
 * Dashboard Topbar — Ministry of Transport Platform
 * Sticky header bar rendered above main content with mobile hamburger trigger.
 */

import type { UserRole } from "@prisma/client";
import Image from "next/image";
import { Avatar } from "@/components/ui/misc";
import { logout } from "@/app/actions/auth";
import { LogOut, Menu } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils/labels";
import { useMobileMenu } from "./mobile-menu-context";

export function DashboardTopbar({
  role,
  userId,
}: {
  role: UserRole;
  userId: string;
}) {
  const { toggle } = useMobileMenu();

  return (
    <header className="h-16 border-b border-border/50 bg-card flex items-center px-4 sm:px-6 gap-3 sm:gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile Hamburger Trigger */}
      <button
        onClick={toggle}
        className="md:hidden p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Branding */}
      <div className="flex items-center gap-2 md:hidden">
        <Image
          width={32}
          height={32}
          src="/anambra_mot_logo.png"
          alt="Anambra MOT"
          className="w-7 h-7 object-contain"
        />
        <span className="font-bold text-sm text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          MOT Portal
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {ROLE_LABELS[role]}
        </p>
        <Avatar name={userId} size="sm" />
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
