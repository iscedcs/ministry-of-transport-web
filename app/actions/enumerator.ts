"use server";

/**
 * Enumerator Dashboard — Ministry of Transport Platform
 *
 * The Enumerator role performs field data entry across every fleet module:
 * TRACAS vehicles and drivers, boats and riders, mass transit fleet, and
 * motor park staff. This powers their landing page — fleet totals plus a
 * personal record of what they have enumerated, read from the AuditLog.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

/** Audit actions that represent an enumeration event. */
const ENUMERATION_ACTIONS = [
  "TRACAS_VEHICLE_ONBOARDED",
  "TRACAS_DRIVER_ONBOARDED",
  "BOAT_ONBOARDED",
  "BOAT_RIDER_ONBOARDED",
];

/** Roles permitted to view the enumerator dashboard. */
const ENUMERATOR_VIEW_ROLES = [
  "ENUMERATOR",
  "SYSTEM_ADMIN",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
] as const;

export interface EnumeratorStats {
  tracasVehicles: number;
  tracasDrivers: number;
  boats: number;
  boatRiders: number;
  massTransitVehicles: number;
  parkStaff: number;
  /** Records enumerated by the signed-in user. */
  myTotal: number;
  myToday: number;
  recent: {
    id: string;
    action: string;
    entityType: string;
    description: string | null;
    createdAt: Date;
  }[];
}

export async function getEnumeratorDashboardStats(): Promise<
  { success: true; data: EnumeratorStats } | { success: false; error: string }
> {
  const authz = await authorize([...ENUMERATOR_VIEW_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      tracasVehicles,
      tracasDrivers,
      boats,
      boatRiders,
      massTransitVehicles,
      parkStaff,
      myTotal,
      myToday,
      recent,
    ] = await Promise.all([
      db.tracasVehicle.count(),
      db.tracasDriver.count(),
      db.boat.count(),
      db.boatRider.count(),
      db.vehicle.count(),
      db.parkStaff.count(),
      db.auditLog.count({
        where: {
          performedByUserId: authz.session.userId,
          action: { in: ENUMERATION_ACTIONS },
        },
      }),
      db.auditLog.count({
        where: {
          performedByUserId: authz.session.userId,
          action: { in: ENUMERATION_ACTIONS },
          createdAt: { gte: todayStart },
        },
      }),
      db.auditLog.findMany({
        where: {
          performedByUserId: authz.session.userId,
          action: { in: ENUMERATION_ACTIONS },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entityType: true,
          changeDescription: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        tracasVehicles,
        tracasDrivers,
        boats,
        boatRiders,
        massTransitVehicles,
        parkStaff,
        myTotal,
        myToday,
        recent: recent.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          description: r.changeDescription,
          createdAt: r.createdAt,
        })),
      },
    };
  } catch (error: unknown) {
    console.error("Error loading enumerator dashboard:", error);
    return { success: false, error: "Failed to load enumeration statistics." };
  }
}
