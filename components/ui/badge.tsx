import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

// ── StatusPill — maps every Prisma workflow status to a color ─────────────────
type WorkflowStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "INSPECTION_SCHEDULED"
  | "INSPECTION_IN_PROGRESS"
  | "PENDING_APPROVAL"
  | "PENDING_PAYMENT"
  | "TEMPORAL_APPROVAL"
  | "PERMIT_TO_BUILD_ISSUED"
  | "CONSTRUCTION_IN_PROGRESS"
  | "FINAL_INSPECTION_SCHEDULED"
  | "FINAL_INSPECTION_IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "REQUIRES_RESUBMISSION"
  | "RE_INSPECTION_REQUIRED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED"
  | "REVALIDATION_PENDING"
  | "REVALIDATION_IN_PROGRESS"
  | string;

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW:
    "bg-[var(--warning-sub)] text-[var(--warning-text)] border-[oklch(75%_0.19_65_/_0.2)]",
  UNDER_REVIEW:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  INSPECTION_SCHEDULED:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  INSPECTION_IN_PROGRESS:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  PENDING_APPROVAL:
    "bg-[var(--warning-sub)] text-[var(--warning-text)] border-[oklch(75%_0.19_65_/_0.2)]",
  PENDING_PAYMENT:
    "bg-[oklch(76%_0.24_45_/_0.12)] text-[oklch(45%_0.21_65)] border-[oklch(76%_0.24_45_/_0.25)]",
  TEMPORAL_APPROVAL:
    "bg-[oklch(76%_0.24_80_/_0.12)] text-[var(--brand-gold)] border-[oklch(76%_0.24_80_/_0.25)]",
  PERMIT_TO_BUILD_ISSUED:
    "bg-[oklch(76%_0.24_80_/_0.12)] text-[var(--brand-gold)] border-[oklch(76%_0.24_80_/_0.25)]",
  CONSTRUCTION_IN_PROGRESS:
    "bg-[oklch(76%_0.24_80_/_0.1)] text-[var(--brand-gold)] border-[oklch(76%_0.24_80_/_0.2)]",
  FINAL_INSPECTION_SCHEDULED:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  FINAL_INSPECTION_IN_PROGRESS:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  APPROVED:
    "bg-[var(--success-sub)] text-[var(--success-text)] border-[oklch(65%_0.18_155_/_0.2)]",
  REJECTED:
    "bg-[var(--error-sub)] text-[var(--error-text)] border-[oklch(60%_0.22_25_/_0.2)]",
  REQUIRES_RESUBMISSION:
    "bg-[var(--error-sub)] text-[var(--error-text)] border-[oklch(60%_0.22_25_/_0.2)]",
  RE_INSPECTION_REQUIRED:
    "bg-[var(--warning-sub)] text-[var(--warning-text)] border-[oklch(75%_0.19_65_/_0.2)]",
  ACTIVE:
    "bg-[var(--success-sub)] text-[var(--success-text)] border-[oklch(65%_0.18_155_/_0.2)]",
  SUSPENDED:
    "bg-[var(--error-sub)] text-[var(--error-text)] border-[oklch(60%_0.22_25_/_0.2)]",
  REVOKED:
    "bg-[var(--error-sub)] text-[var(--error-text)] border-[oklch(60%_0.22_25_/_0.2)]",
  EXPIRED: "bg-secondary text-muted-foreground border-border/50",
  REVALIDATION_PENDING:
    "bg-[var(--warning-sub)] text-[var(--warning-text)] border-[oklch(75%_0.19_65_/_0.2)]",
  REVALIDATION_IN_PROGRESS:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  // Inspection-level statuses
  SCHEDULED:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  IN_PROGRESS:
    "bg-[var(--info-sub)] text-[var(--info-text)] border-[oklch(62%_0.21_265_/_0.2)]",
  COMPLETED:
    "bg-[var(--success-sub)] text-[var(--success-text)] border-[oklch(65%_0.18_155_/_0.2)]",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  INSPECTION_SCHEDULED: "Inspection Scheduled",
  INSPECTION_IN_PROGRESS: "Inspection In Progress",
  PENDING_APPROVAL: "Pending Approval",
  PENDING_PAYMENT: "Pending Payment",
  TEMPORAL_APPROVAL: "Temporary Approval",
  PERMIT_TO_BUILD_ISSUED: "Permit to Build",
  CONSTRUCTION_IN_PROGRESS: "Under Construction",
  FINAL_INSPECTION_SCHEDULED: "Final Insp. Scheduled",
  FINAL_INSPECTION_IN_PROGRESS: "Final Inspection",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REQUIRES_RESUBMISSION: "Resubmission Required",
  RE_INSPECTION_REQUIRED: "Re-inspection Required",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
  REVALIDATION_PENDING: "Revalidation Pending",
  REVALIDATION_IN_PROGRESS: "Revalidating",
  // Inspection-level statuses
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Report Submitted",
};

export function StatusPill({
  status,
  className,
}: {
  status: WorkflowStatus;
  className?: string;
}) {
  const styles =
    STATUS_STYLES[status] ??
    "bg-secondary text-muted-foreground border-border/50";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
        "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-70",
        styles,
        className,
      )}>
      {label}
    </span>
  );
}
