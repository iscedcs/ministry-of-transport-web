/**
 * Special Enforcement Unit ID numbers.
 *
 * Same shape as the park staff security code (lib/staff-code.ts) —
 *
 *   MOT/Awk/SEU./001
 *
 * Ministry, the member's town, the unit token, then a serial. The serial runs
 * within a town ("Awk"), so Awka's members count from 001 independently of
 * Onitsha's. The token is always SEU: a member's group (and so their unit) can
 * change after the card is printed, and a number on a vest must never change.
 *
 * Assigned once, when the ID card is issued, and stored on the application.
 */
import { townPart } from "./staff-code";

const UNIT_TOKEN = "SEU";

/** Everything before the serial, e.g. "MOT/Awk/SEU./". */
export function enforcementCodePrefix(town: string | null | undefined): string {
  return `MOT/${townPart(town)}/${UNIT_TOKEN}./`;
}

export function buildEnforcementCode(
  town: string | null | undefined,
  serial: number,
): string {
  return `${enforcementCodePrefix(town)}${String(serial).padStart(3, "0")}`;
}

/** Serial of an existing code under a prefix, or 0 if it does not parse. */
export function serialOf(code: string, prefix: string): number {
  if (!code.startsWith(prefix)) return 0;
  const n = parseInt(code.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The code to show for an application. Cards issued before codes existed have
 * none stored; they fall back to the old PM- reference until backfilled
 * (scripts/backfill-enforcement-codes.ts).
 */
export function enforcementDisplayCode(app: {
  id: string;
  idCode?: string | null;
}): string {
  return app.idCode || `PM-${app.id.slice(0, 6).toUpperCase()}`;
}
