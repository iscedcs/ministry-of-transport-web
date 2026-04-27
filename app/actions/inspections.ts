"use server";

/**
 * Inspections Queue — Ministry of Transport Platform
 * FR-011 | FR-023 | ROLES_AND_DUTIES.md (HOD — Review Reports)
 *
 * Central list of all inspections across Motor Parks and Mass Transit.
 *
 * Access control:
 *  - FIELD_INSPECTOR: own assigned inspections only
 *  - HOD_* / COMMISSIONER / PERMANENT_SECRETARY / SYSTEM_ADMIN: all inspections
 */

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { PAGE_SIZE } from "@/lib/consts";

// ── Types ──────────────────────────────────────────────────────────────────────

export type InspectionListItem = {
  id: string;
  inspectionType: string; // "INITIAL" | "RE_INSPECTION"
  linkedEntityType: string; // "MOTOR_PARK" | "MASS_TRANSIT"
  entityName: string;
  entityHref: string;
  scheduledDate: Date;
  completedAt: Date | null;
  status: string; // InspectionStatus enum value
  inspectorName: string;
  recommendedAction: string | null; // "APPROVE" | "REJECT" | "CONDITIONAL"
};

type ListResult = {
  inspections: InspectionListItem[];
  total: number;
};

const ALLOWED_ROLES = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_PARKS",
  "HOD_VIS",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "FIELD_INSPECTOR",
  "SYSTEM_ADMIN",
] as const;

// ── listInspections ────────────────────────────────────────────────────────────

export async function listInspections(
  page = 1,
  status?: string,
  entityType?: string,
): Promise<ActionResult<ListResult>> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  if (!(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const where = {
    ...(status ? { status: status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "REJECTED" } : {}),
    ...(entityType ? { linkedEntityType: entityType } : {}),
    // Field inspectors only see their assigned inspections
    ...(session.role === "FIELD_INSPECTOR"
      ? { assignedToUserId: session.userId }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.inspection.findMany({
      where,
      orderBy: { scheduledDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        motorPark: { select: { id: true, businessName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    }),
    db.inspection.count({ where }),
  ]);

  // Batch-resolve MASS_TRANSIT entity names (no direct relation on Inspection)
  const transitIds = items
    .filter((i) => i.linkedEntityType === "MASS_TRANSIT")
    .map((i) => i.linkedEntityId);

  const transitMap = new Map<string, string>();
  if (transitIds.length > 0) {
    const companies = await db.massTransitCompany.findMany({
      where: { id: { in: transitIds } },
      select: { id: true, companyName: true },
    });
    for (const c of companies) transitMap.set(c.id, c.companyName);
  }

  const inspections: InspectionListItem[] = items.map((i) => {
    let entityName = "Unknown";
    let entityHref = "#";

    if (i.linkedEntityType === "MOTOR_PARK" && i.motorPark) {
      entityName = i.motorPark.businessName;
      entityHref = `/motor-parks/${i.motorPark.id}`;
    } else if (i.linkedEntityType === "MASS_TRANSIT") {
      entityName = transitMap.get(i.linkedEntityId) ?? "Unknown";
      entityHref = `/fleet-operators/${i.linkedEntityId}`;
    }

    return {
      id: i.id,
      inspectionType: i.inspectionType,
      linkedEntityType: i.linkedEntityType,
      entityName,
      entityHref,
      scheduledDate: i.scheduledDate,
      completedAt: i.completedAt ?? null,
      status: i.status,
      inspectorName: `${i.assignedTo.firstName} ${i.assignedTo.lastName}`,
      recommendedAction: i.recommendedAction ?? null,
    };
  });

  return { success: true, data: { inspections, total } };
}
