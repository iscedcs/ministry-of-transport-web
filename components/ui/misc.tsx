/**
 * Misc utility components — Tailwind-based (no inline styles).
 * Spinner, Skeleton, Avatar, Divider, EmptyState, StatCard
 */
import * as React from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const spinnerSize = { sm: "w-4 h-4 border-2", md: "w-5 h-5 border-2", lg: "w-8 h-8 border-[3px]" } as const;

export function Spinner({ size = "md", label = "Loading..." }: { size?: keyof typeof spinnerSize; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block rounded-full border-border border-t-primary animate-spin",
        spinnerSize[size]
      )}
    />
  );
}

interface SkeletonProps extends ComponentPropsWithoutRef<"div"> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ width, height = "1rem", className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("bg-secondary animate-pulse rounded-md", className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

const avatarSize = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" } as const;

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string; size?: keyof typeof avatarSize; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-semibold bg-secondary text-foreground overflow-hidden flex-shrink-0", avatarSize[size], className)}
      title={name}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border/50 m-0", className)} />;
}

interface EmptyStateProps { title: string; message?: string; action?: React.ReactNode; icon?: React.ReactNode; }

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
      {icon ?? (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="opacity-30" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {message && <p className="text-sm max-w-xs">{message}</p>}
      {action}
    </div>
  );
}

interface StatCardProps { label: string; value: string | number; delta?: string; deltaDirection?: "up" | "down" | "neutral"; icon?: React.ReactNode; className?: string; }

export function StatCard({ label, value, delta, deltaDirection = "neutral", icon, className }: StatCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-5 flex flex-col gap-2 hover:border-[var(--border-gold)] hover:shadow-sm transition-[border-color,box-shadow]", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-primary flex-shrink-0" aria-hidden="true">{icon}</span>}
      </div>
      <span className="text-3xl font-bold text-foreground leading-none" style={{ fontFamily: "var(--font-display)" }}>{value}</span>
      {delta && (
        <span className={cn("text-xs font-semibold", deltaDirection === "up" && "text-[var(--success-text)]", deltaDirection === "down" && "text-[var(--error-text)]", deltaDirection === "neutral" && "text-muted-foreground")}>
          {deltaDirection === "up" ? "^ " : deltaDirection === "down" ? "v " : ""}{delta}
        </span>
      )}
    </div>
  );
}
