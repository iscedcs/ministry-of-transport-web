/**
 * Audit trail helper — Ministry of Transport Platform
 *
 * The Motor Parks, Mass Transit and Admin modules write AuditLog rows inline.
 * The TRACAS and Maritime (boat) modules did not, leaving their fleet, driver,
 * rider and sticker mutations untracked. This wraps the write so those modules
 * can log consistently without repeating the boilerplate.
 *
 * Auditing must never break the operation it records: a failure here is logged
 * to the server console and swallowed.
 */
import "server-only";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export interface AuditEntry {
  /** Verb, screaming snake case — e.g. "TRACAS_VEHICLE_ONBOARDED". */
  action: string;
  /** Entity family — e.g. "TRACAS_VEHICLE", "BOAT", "BOAT_STICKER". */
  entityType: string;
  entityId: string;
  /** Human-readable one-liner shown in the admin audit view. */
  changeDescription?: string;
  oldValues?: unknown;
  newValues?: unknown;
}

const serialise = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  try {
    return JSON.stringify(v);
  } catch {
    return undefined;
  }
};

/**
 * Write one audit row attributed to the current session user.
 *
 * No-ops when there is no session — AuditLog.performedByUserId is a required
 * relation, so an unauthenticated caller cannot be attributed. Callers that
 * must always produce a trail should enforce auth before calling.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const session = await getSession();
    if (!session) {
      console.warn(
        `[audit] Skipped ${entry.action} on ${entry.entityType}:${entry.entityId} — no session.`,
      );
      return;
    }

    await db.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeDescription: entry.changeDescription ?? null,
        oldValues: serialise(entry.oldValues) ?? null,
        newValues: serialise(entry.newValues) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to record audit entry:", entry.action, error);
  }
}
