/**
 * Dashboard Topbar — Ministry of Transport Platform
 * Sticky header bar rendered above main content.
 * Includes mobile hamburger menu on mobile devices.
 */

"use client";

import type { UserRole } from "@prisma/client";
import { Avatar } from "@/components/ui/misc";
import { logout } from "@/app/actions/auth";
import { LogOut, Menu } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils/labels";
import { useMobileMenu } from "./mobile-menu-context";
import { Button } from "@/components/ui/button";

export function DashboardTopbar({
  role,
  userId,
}: {
  role: UserRole;
  userId: string;
}) {
  const { toggle } = useMobileMenu();

  return (
    <header className="h-16 border-b border-border/50 bg-card flex items-center px-4 md:px-6 gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="md:hidden"
        aria-label="Toggle sidebar">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {ROLE_LABELS[role]}
        </p>
        <Avatar name={userId} size="sm" />
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            title="Sign out">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
