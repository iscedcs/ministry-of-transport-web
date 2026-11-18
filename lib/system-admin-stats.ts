import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * Platform-wide numbers for the System Admin dashboard.
 *
 * Everything here is a COUNT — no rows are loaded — so the cost does not grow
 * with the register. The queries run in parallel.
 *
 * Counting rules worth knowing:
 *  - "Vehicles" are counted per service registration. A vehicle that is on
 *    two services (say CVR and TRACAS) appears under each; there is no shared
 *    vehicle id across the modules to de-duplicate on.
 *  - Mass transit vehicles that were removed (`removedAt` set) are excluded.
 *  - A sticker counts as "assigned" when it is bound to a record. TRACAS and
 *    maritime use a pre-imported pool of stickers (assigned flag); the other
 *    services store the scanned code on the vehicle (`stickerNumber`).
 *  - Boats are vessels, not road vehicles, so they sit beside the vehicle
 *    total rather than inside it.
 */

/** A real value: not null and not an empty string. */
const hasSticker = { stickerNumber: { not: null }, NOT: { stickerNumber: "" } } as const;

export interface ServiceVehicleRow {
  key: string;
  label: string;
  /** Where the full list lives, for the "open" link. */
  href: string;
  vehicles: number;
  withSticker: number;
  /** Small status chips, e.g. "Approved 120". */
  breakdown: { label: string; count: number }[];
}

export interface StickerPoolRow {
  label: string;
  imported: number;
  assigned: number;
  available: number;
}

export interface SystemAdminOverview {
  generatedAt: Date;

  vehicles: {
    total: number;
    withSticker: number;
    withoutSticker: number;
    byService: ServiceVehicleRow[];
    vessels: { total: number; withSticker: number };
  };

  stickers: {
    /** Every sticker bound to a vehicle or vessel, across all services. */
    totalAssigned: number;
    pools: StickerPoolRow[];
    /** Pooled stickers not yet bound to anything. */
    poolAvailable: number;
  };

  operators: {
    motorParks: number;
    activeMotorParks: number;
    massTransitCompanies: number;
    revalidationApplications: number;
    revalidationsNumbered: number;
    logisticsApplicants: number;
    terminals: number;
  };

  people: {
    totalUsers: number;
    activeUsers: number;
    deactivatedUsers: number;
    loggedInLast30Days: number;
    staff: number;
    applicants: number;
    byRole: { role: string; count: number }[];
    parkStaff: number;
    activeParkStaff: number;
    enforcementApproved: number;
    enforcementPending: number;
    enforcementGroups: number;
    drivers: { label: string; count: number }[];
    totalDrivers: number;
  };

  revenue: {
    completedNaira: number;
    completedCount: number;
    pendingCount: number;
  };

  recentActivity: {
    id: string;
    action: string;
    description: string | null;
    entityType: string;
    createdAt: Date;
    actor: string | null;
  }[];
}

/** Roles that are members of the public or field programmes, not Ministry staff. */
const NON_STAFF_ROLES = ["EXTERNAL_APPLICANT", "PARK_MONITOR"] as const;

export async function getSystemAdminOverview(): Promise<SystemAdminOverview | null> {
  // The caller has to be the System Admin; anything else gets nothing, even if
  // a page forgets to check.
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    // ── Vehicles per service ──
    tracasVehicles,
    tracasByLetter,
    tracasStickerOnVehicle,
    massTransitVehicles,
    massTransitActive,
    massTransitWithSticker,
    cvrVehicles,
    cvrByStatus,
    cvrWithSticker,
    towingVans,
    towingPermitted,
    towingWithSticker,
    logisticsVehicles,
    logisticsWithSticker,
    boats,
    boatStickerOnBoat,

    // ── Sticker pools ──
    tracasPoolTotal,
    tracasPoolAssigned,
    boatPoolTotal,
    boatPoolAssigned,

    // ── Operators ──
    motorParks,
    activeMotorParks,
    massTransitCompanies,
    revalidationApplications,
    revalidationsNumbered,
    logisticsApplicants,
    terminals,

    // ── People ──
    totalUsers,
    activeUsers,
    loggedInRecently,
    staffUsers,
    applicantUsers,
    roleGroups,
    parkStaff,
    activeParkStaff,
    enforcementApproved,
    enforcementPending,
    enforcementGroups,
    tracasDrivers,
    cvrDrivers,
    massTransitDrivers,
    boatRiders,

    // ── Money ──
    paymentsDone,
    paymentsPending,

    // ── Activity ──
    activity,
  ] = await Promise.all([
    db.tracasVehicle.count(),
    db.tracasVehicle.groupBy({ by: ["letterStatus"], _count: { _all: true } }),
    db.tracasSticker.count({ where: { assignedVehicleId: { not: null } } }),
    db.vehicle.count({ where: { removedAt: null } }),
    db.vehicle.count({ where: { removedAt: null, status: "ACTIVE" } }),
    db.vehicle.count({ where: { removedAt: null, ...hasSticker } }),
    db.cvrVehicle.count(),
    db.cvrVehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    db.cvrVehicle.count({ where: hasSticker }),
    db.towingVan.count(),
    db.towingVan.count({ where: { status: "PERMIT_ISSUED" } }),
    db.towingVan.count({ where: hasSticker }),
    db.logisticsVehicle.count(),
    db.logisticsVehicle.count({ where: hasSticker }),
    db.boat.count(),
    db.boatSticker.count({ where: { assignedBoatId: { not: null } } }),

    db.tracasSticker.count(),
    db.tracasSticker.count({ where: { isAssigned: true } }),
    db.boatSticker.count(),
    db.boatSticker.count({ where: { isAssigned: true } }),

    db.motorPark.count(),
    db.motorPark.count({ where: { permitStatus: "ACTIVE" } }),
    db.massTransitCompany.count(),
    db.revalidationApplication.count(),
    db.revalidationApplication.count({ where: { revalidationNumber: { not: null } } }),
    db.logisticsApplicant.count(),
    db.terminal.count(),

    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    db.user.count({ where: { role: { notIn: [...NON_STAFF_ROLES] } } }),
    db.user.count({ where: { role: "EXTERNAL_APPLICANT" } }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.parkStaff.count(),
    db.parkStaff.count({ where: { status: "ACTIVE" } }),
    db.parkMonitorApplication.count({ where: { status: "APPROVED", idCardIssued: true } }),
    db.parkMonitorApplication.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] } },
    }),
    db.enforcementGroup.count(),
    db.tracasDriver.count(),
    db.cvrDriver.count(),
    db.driver.count(),
    db.boatRider.count(),

    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true }, _count: { _all: true } }),
    db.payment.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),

    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        changeDescription: true,
        entityType: true,
        createdAt: true,
        performedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const letter = (s: string) => tracasByLetter.find((g) => g.letterStatus === s)?._count._all ?? 0;
  const cvr = (s: string) => cvrByStatus.find((g) => g.status === s)?._count._all ?? 0;

  const byService: ServiceVehicleRow[] = [
    {
      key: "tracas",
      label: "TRACAS",
      href: "/tracas",
      vehicles: tracasVehicles,
      withSticker: tracasStickerOnVehicle,
      breakdown: [
        { label: "Letter approved", count: letter("APPROVED") },
        { label: "Awaiting approval", count: tracasVehicles - letter("APPROVED") - letter("DECLINED") },
        { label: "Declined", count: letter("DECLINED") },
      ],
    },
    {
      key: "mass-transit",
      label: "Mass Transit",
      href: "/fleet-operators",
      vehicles: massTransitVehicles,
      withSticker: massTransitWithSticker,
      breakdown: [
        { label: "Active", count: massTransitActive },
        { label: "Other status", count: massTransitVehicles - massTransitActive },
      ],
    },
    {
      key: "cvr",
      label: "Commercial Vehicle Registry",
      href: "/commercial-vehicles",
      vehicles: cvrVehicles,
      withSticker: cvrWithSticker,
      breakdown: [
        { label: "Identified (VIN)", count: cvr("IDENTIFIED") },
        { label: "Registered", count: cvr("REGISTERED") },
        { label: "Draft", count: cvr("DRAFT") },
      ],
    },
    {
      key: "towing",
      label: "Towing Vans",
      href: "/towing-vans",
      vehicles: towingVans,
      withSticker: towingWithSticker,
      breakdown: [
        { label: "Permit issued", count: towingPermitted },
        { label: "Registered only", count: towingVans - towingPermitted },
      ],
    },
    {
      key: "logistics",
      label: "Logistics",
      href: "/logistics",
      vehicles: logisticsVehicles,
      withSticker: logisticsWithSticker,
      breakdown: [],
    },
  ];

  const totalVehicles = byService.reduce((n, s) => n + s.vehicles, 0);
  const vehiclesWithSticker = byService.reduce((n, s) => n + s.withSticker, 0);

  const pools: StickerPoolRow[] = [
    {
      label: "TRACAS pool",
      imported: tracasPoolTotal,
      assigned: tracasPoolAssigned,
      available: tracasPoolTotal - tracasPoolAssigned,
    },
    {
      label: "Maritime pool",
      imported: boatPoolTotal,
      assigned: boatPoolAssigned,
      available: boatPoolTotal - boatPoolAssigned,
    },
  ];

  const drivers = [
    { label: "TRACAS drivers", count: tracasDrivers },
    { label: "Commercial (CVR) drivers", count: cvrDrivers },
    { label: "Mass transit drivers", count: massTransitDrivers },
    { label: "Boat riders", count: boatRiders },
  ];

  return {
    generatedAt: new Date(),

    vehicles: {
      total: totalVehicles,
      withSticker: vehiclesWithSticker,
      withoutSticker: totalVehicles - vehiclesWithSticker,
      byService,
      vessels: { total: boats, withSticker: boatStickerOnBoat },
    },

    stickers: {
      totalAssigned: vehiclesWithSticker + boatStickerOnBoat,
      pools,
      poolAvailable: pools.reduce((n, p) => n + p.available, 0),
    },

    operators: {
      motorParks,
      activeMotorParks,
      massTransitCompanies,
      revalidationApplications,
      revalidationsNumbered,
      logisticsApplicants,
      terminals,
    },

    people: {
      totalUsers,
      activeUsers,
      deactivatedUsers: totalUsers - activeUsers,
      loggedInLast30Days: loggedInRecently,
      staff: staffUsers,
      applicants: applicantUsers,
      byRole: roleGroups
        .map((g) => ({ role: g.role as string, count: g._count._all }))
        .sort((a, b) => b.count - a.count),
      parkStaff,
      activeParkStaff,
      enforcementApproved,
      enforcementPending,
      enforcementGroups,
      drivers,
      totalDrivers: drivers.reduce((n, d) => n + d.count, 0),
    },

    revenue: {
      completedNaira: (paymentsDone._sum.amount ?? 0) / 100,
      completedCount: paymentsDone._count._all,
      pendingCount: paymentsPending,
    },

    recentActivity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      description: a.changeDescription,
      entityType: a.entityType,
      createdAt: a.createdAt,
      actor: a.performedBy ? `${a.performedBy.firstName} ${a.performedBy.lastName}` : null,
    })),
  };
}
