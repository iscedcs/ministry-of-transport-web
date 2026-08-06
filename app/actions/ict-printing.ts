"use server";

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export interface PrintingItem {
  id: string;
  category:
    | "DRIVER_ID_CARD"
    | "LETTER_OF_AUTHORITY"
    | "PARK_STAFF_ID_CARD"
    | "BOAT_PERMIT";
  title: string;
  subtitle: string;
  refOrCode: string;
  issueDate?: string | Date | null;
  status: string;
  printUrl: string;
  photoUrl?: string | null;
}

/** Who may see the printing queue. */
const PRINTING_ROLES = [
  "ICT_OFFICER",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
] as const;

export async function getIctPrintingQueues(searchQuery = "") {
  // Previously the session was read and discarded, leaving this open to any
  // authenticated user — including external applicants.
  const authz = await authorize([...PRINTING_ROLES]);
  if (!authz.ok) {
    return {
      success: false as const,
      error: authz.error,
      stats: {
        totalToPrint: 0,
        driverIdCardsCount: 0,
        lettersCount: 0,
        parkStaffCount: 0,
        boatPermitsCount: 0,
      },
      items: [],
      driverItems: [],
      vehicleItems: [],
      parkStaffItems: [],
      boatItems: [],
    };
  }

  const q = searchQuery.trim().toLowerCase();

  // 1. Fetch TRACAS Driver ID Cards
  const drivers = await db.tracasDriver.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      securityCode: true,
      licenseNumber: true,
      photoUrl: true,
      createdAt: true,
      status: true,
      operatorAssociation: true,
    },
  });

  // 2. Fetch TRACAS Letters of Authority.
  // Only fully-approved letters reach the printing queue: both the TRACAS MD
  // and the Commissioner must have signed. Anything earlier in the chain is
  // still a draft and must not be printed.
  const vehicles = await db.tracasVehicle.findMany({
    where: { letterStatus: "APPROVED" },
    take: 100,
    orderBy: { commissionerApprovedAt: "desc" },
    include: {
      assignedDriver: {
        select: { fullName: true, photoUrl: true },
      },
    },
  });

  // 3. Fetch Park Staff ID Cards
  const parkMonitors = await db.parkMonitorApplication.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  // 4. Fetch Boat Permits
  const boats = await db.boat.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      assignedRider: {
        select: { fullName: true },
      },
    },
  });

  // Filter & Format Data
  const driverItems: PrintingItem[] = drivers.map((d) => ({
    id: d.id,
    category: "DRIVER_ID_CARD",
    title: d.fullName,
    subtitle: `Commercial Driver (${d.operatorAssociation || "Transport Company Of Anambra State"})`,
    refOrCode: `Code: ${d.securityCode || "N/A"}`,
    issueDate: d.createdAt,
    status: d.status,
    printUrl: `/tracas/driver/${d.id}/id-card`,
    photoUrl: d.photoUrl,
  }));

  const vehicleItems: PrintingItem[] = vehicles.map((v) => ({
    id: v.id,
    category: "LETTER_OF_AUTHORITY",
    title: `Vehicle: ${v.registrationNumber} (Fleet: ${v.fleetNumber})`,
    subtitle: `Driver: ${v.assignedDriver?.fullName || "Unassigned"}`,
    refOrCode: `Ref: ${v.authorityRef}`,
    issueDate: v.authorityIssueDate || v.createdAt,
    status: v.status,
    printUrl: `/tracas/${v.id}/letter`,
    photoUrl: v.assignedDriver?.photoUrl,
  }));

  const parkStaffItems: PrintingItem[] = parkMonitors.map((m) => {
    const rawM = m as any;
    return {
      id: m.id,
      category: "PARK_STAFF_ID_CARD",
      title:
        rawM.fullName || rawM.firstName
          ? `${rawM.firstName || ""} ${rawM.lastName || ""}`
          : "Park Staff Monitor",
      subtitle: `Park: ${rawM.parkName || rawM.preferredLocation || "Anambra State Park"}`,
      refOrCode: `ID: PM-${m.id.slice(0, 6).toUpperCase()}`,
      issueDate: m.createdAt,
      status: m.status,
      printUrl: `/verify/park-staff/${m.id}`,
      photoUrl: m.idCardPhotoUrl,
    };
  });

  const boatItems: PrintingItem[] = boats.map((b) => ({
    id: b.id,
    category: "BOAT_PERMIT",
    title: `Boat: ${b.name} (${b.registrationNumber})`,
    subtitle: `Rider: ${b.assignedRider?.fullName || "N/A"} · Type: ${b.boatType}`,
    refOrCode: `Sec Code: ${b.securityCode}`,
    issueDate: b.createdAt,
    status: b.status,
    printUrl: `/verify/boat/${b.id}`,
    photoUrl: null,
  }));

  const allItems = [
    ...driverItems,
    ...vehicleItems,
    ...parkStaffItems,
    ...boatItems,
  ];

  const filterFn = (i: PrintingItem) =>
    !q ||
    i.title.toLowerCase().includes(q) ||
    i.subtitle.toLowerCase().includes(q) ||
    i.refOrCode.toLowerCase().includes(q);

  return {
    success: true,
    stats: {
      totalToPrint: allItems.length,
      driverIdCardsCount: driverItems.length,
      lettersCount: vehicleItems.length,
      parkStaffCount: parkStaffItems.length,
      boatPermitsCount: boatItems.length,
    },
    items: allItems.filter(filterFn),
    driverItems: driverItems.filter(filterFn),
    vehicleItems: vehicleItems.filter(filterFn),
    parkStaffItems: parkStaffItems.filter(filterFn),
    boatItems: boatItems.filter(filterFn),
  };
}
