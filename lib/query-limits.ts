/**
 * Row caps for list queries.
 *
 * An unbounded findMany is fine at today's volumes and quietly ruinous later:
 * the query that returned 139 stickers this year returns 13,900 next year, on
 * every page view, and nothing in the code says otherwise.
 *
 * These caps sit far above any realistic current volume, so behaviour is
 * unchanged today. They exist so a query cannot run away as the register
 * grows — a ceiling, not pagination. Where a list genuinely needs to show
 * everything, it needs paging, not a bigger number here.
 */

/** General-purpose ceiling for a list rendered in one view. */
export const MAX_LIST_ROWS = 1000;

/** Bulk export — larger, because completeness is the point of an export. */
export const MAX_EXPORT_ROWS = 10000;

/** Rows per page on the TRACAS hub. */
export const TRACAS_PAGE_SIZE = 25;

/** The three TRACAS hub tabs; only the active one is queried. */
export type TracasTabKey = "vehicles" | "drivers" | "stickers";
