/**
 * Row — reusable label/value row components for detail view cards.
 *
 * RowGrid  — two-column grid (label left, value right), used on entity detail pages.
 * RowFlex  — flex space-between (label left, value right-aligned), used in payment cards.
 */

import { cn } from "@/lib/utils";

interface RowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

/** Two-column grid row. Label on the left, value on the right. */
export function RowGrid({ label, value, className }: RowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 py-2.5 border-b border-border/50 last:border-0",
        className,
      )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium break-words">
        {value ?? "—"}
      </span>
    </div>
  );
}

/** Flex space-between row. Label left, value right-aligned. */
export function RowFlex({ label, value, className }: RowProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 py-2 border-b border-border/50 last:border-0 text-sm",
        className,
      )}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value ?? "—"}</span>
    </div>
  );
}
