/**
 * Special Enforcement Unit ID numbers.
 *
 * Same shape as the park staff security code (lib/staff-code.ts) —
 *
 *   MOT/AWS/SEU./001
 *
 * Ministry, the member's Local Government of Operation (a fixed code, see
 * lib/lga-code.ts), the unit token, then a serial. The serial runs within a
 * local government, so Awka South counts from 001 independently of Onitsha
 * North. The token is always SEU: members are approved into the Special
 * Enforcement Unit first and grouped into other units afterwards, and a
 * number on a vest must never change.
 *
 * The local government is the one the approving HOD assigned, not the
 * applicant's own. Assigned once, when the ID card is issued, and stored on
 * the application.
 */
import { canonicalLga, lgaCode } from "./lga-code";

const UNIT_TOKEN = "SEU";

/** Everything before the serial, e.g. "MOT/AWS/SEU./". */
export function enforcementCodePrefix(lga: string | null | undefined): string {
  return `MOT/${lgaCode(lga)}/${UNIT_TOKEN}./`;
}

export function buildEnforcementCode(
  lga: string | null | undefined,
  serial: number,
): string {
  return `${enforcementCodePrefix(lga)}${String(serial).padStart(3, "0")}`;
}

/** Serial of an existing code under a prefix, or 0 if it does not parse. */
export function serialOf(code: string, prefix: string): number {
  if (!code.startsWith(prefix)) return 0;
  const n = parseInt(code.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The Local Government of Operation to show for an application: the one the
 * HOD assigned. Cards issued before this existed have none, so they fall back
 * to the applicant's own LGA — the value they were printed with.
 */
export function operationLgaOf(app: {
  operationLga?: string | null;
  lga: string;
}): string {
  return app.operationLga || app.lga;
}

/**
 * The LGA an HOD should be offered at approval: what the applicant asked for
 * when it is a real LGA, else their own LGA if that is, else nothing (the HOD
 * must choose).
 */
export function suggestedOperationLga(app: {
  preferredOperationLga?: string | null;
  lga: string;
}): string {
  return (
    canonicalLga(app.preferredOperationLga) ?? canonicalLga(app.lga) ?? ""
  );
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
