// ── Format Utilities — Ministry of Transport Platform ─────────────────────────
// Centralised date and currency formatters (en-NG locale).

/**
 * Format a kobo amount as a Naira currency string.
 * Returns "—" for null/undefined.
 */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

/**
 * Format a date as "27 Apr 2026" (day + abbreviated month + year).
 * Returns "—" (or the provided fallback) for null/undefined.
 */
export function fmtDateShort(
  d: Date | null | undefined,
  fallback = "—",
): string {
  if (!d) return fallback;
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

/**
 * Format a date as "27 Apr 2026" (medium style).
 * Returns "—" (or the provided fallback) for null/undefined.
 */
export function fmtDate(d: Date | null | undefined, fallback = "—"): string {
  if (!d) return fallback;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
    new Date(d),
  );
}

/**
 * Format a date as "27 April 2026 at 01:54" (long date + short time).
 * Returns "—" for null/undefined.
 */
export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(d));
}

/**
 * Format a date as "27 Apr 2026, 01:54" (medium date + short time).
 * Returns "—" for null/undefined.
 */
export function fmtDateTimeShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

/**
 * Format a "YYYY-MM" string as "Apr 2026".
 * Used in monthly revenue trend charts.
 */
export function fmtMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
  }).format(new Date(parseInt(year), parseInt(month) - 1, 1));
}
