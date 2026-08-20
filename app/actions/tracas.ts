"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getNumberSetting, getBoolSetting } from "@/lib/system-config";
import {
  MAX_LIST_ROWS,
  TRACAS_PAGE_SIZE,
  type TracasTabKey,
} from "@/lib/query-limits";
import { checkStoredUrl } from "@/lib/media-url";
import { revalidatePath } from "next/cache";
import { extractStickerCode } from "@/lib/tracas-sticker";
import {
  authorize,
  FLEET_WRITE_ROLES,
  FLEET_EDIT_ROLES,
  FLEET_VIEW_ROLES,
} from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export interface OnboardTracasVehicleInput {
  registrationNumber: string;
  fleetNumber: string;
  category?: string;
  /** Seating capacity — its own field, separate from the sub-category text. */
  capacity?: number | string;
  makeModel?: string;
  engineNumber?: string;
  chassisNumber?: string;
  insuranceCertificateNo?: string;
  insuranceCommencement?: string;
  insuranceExpiry?: string;
  particularsIssueDate?: string;
  particularsExpiryDate?: string;
  assignedRoute?: string;
  ownershipType?: string;
  /** "EXISTING" (already operating under TRACAS) | "NEW_JOINER" (joining now) */
  enrollmentType?: string;
  joinedCompanyAt?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerNIN?: string;
  authorityRef?: string;
  authorityIssueDate?: string;
  authorityExpiryDate?: string;
  stickerId?: string;
  assignedDriverId?: string;
}


export interface OnboardTracasDriverInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  photoUrl?: string;
  nin?: string;
  asinNumber?: string;
  residentialAddress?: string;
  stateOfOrigin?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  educationalQualification?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
  licenseNumber?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  operatorAssociation?: string;
  notes?: string;
}

// ─── Sticker Pool Actions ──────────────────────────────────────────────────

export async function addStickerUrlsToTracasPool(inputUrls: string[]) {
  try {
    // Loading the sticker inventory is an administrative action.
    const authz = await authorize(["SYSTEM_ADMIN", "ADMIN"]);
    if (!authz.ok) {
      return { success: false, error: authz.error };
    }

    const urls = inputUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    if (urls.length === 0) {
      return { success: false, error: "No valid sticker URLs provided." };
    }

    let addedCount = 0;
    for (const url of urls) {
      const stickerCode =
        extractStickerCode(url) ||
        `TRAC-STK-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.tracasSticker.upsert({
        where: { stickerUrl: url },
        update: {},
        create: {
          stickerUrl: url,
          stickerCode: stickerCode,
          isAssigned: false,
        },
      });
      addedCount++;
    }

    await recordAudit({
      action: "TRACAS_STICKER_POOL_IMPORTED",
      entityType: "TRACAS_STICKER",
      entityId: "pool",
      changeDescription: `Pre-loaded ${addedCount} sticker(s) into the TRACAS inventory pool`,
      newValues: { count: addedCount },
    });

    revalidatePath("/tracas");
    return { success: true, count: addedCount };
  } catch (error: any) {
    console.error("Error adding TRACAS stickers:", error);
    return { success: false, error: error?.message || "Failed to add stickers." };
  }
}

export async function getAvailableTracasStickers() {
  try {
    const stickers = await db.tracasSticker.findMany({
      where: { isAssigned: false },
      select: { id: true, stickerCode: true, stickerUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      // Stickers are pre-loaded in bulk, so this list grows in jumps. The cap
      // is far above any realistic batch; it exists so the query cannot run
      // away as the register grows.
      take: MAX_LIST_ROWS,
    });
    return { success: true, data: stickers };
  } catch (error: any) {
    console.error("Error fetching available TRACAS stickers:", error);
    return { success: false, error: "Failed to fetch stickers." };
  }
}

export async function getTracasStickersList() {
  try {
    const stickers = await db.tracasSticker.findMany({
      select: {
        id: true,
        stickerCode: true,
        stickerUrl: true,
        isAssigned: true,
        assignedAt: true,
        createdAt: true,
        assignedVehicle: {
          select: { id: true, registrationNumber: true, fleetNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_LIST_ROWS,
    });
    return { success: true, data: stickers };
  } catch (error: any) {
    console.error("Error fetching TRACAS sticker list:", error);
    return { success: false, error: "Failed to fetch sticker list." };
  }
}

// ─── Auto Generators ───────────────────────────────────────────────────────

/**
 * The next free fleet number for a prefix.
 *
 * Three things are now admin-controlled rather than hard-coded (see
 * lib/system-config.ts): where the sequence resumes, how wide the number is
 * padded, and whether gaps left by removed vehicles are reused. The counter
 * override exists because a mis-assigned number used to require a developer.
 *
 * Whatever the settings say, a number already in use is never handed out.
 */
async function generateNextFleetNumber(ownershipType?: string): Promise<string> {
  const isGov = ownershipType === "GOVERNMENT_OWNED";
  const prefix = isGov ? "FT" : "LV";

  const [vehicles, padding, override, fillGaps] = await Promise.all([
    // Only the series being issued from. This used to read every vehicle in
    // the register to compute one number.
    db.tracasVehicle.findMany({
      where: { fleetNumber: { startsWith: prefix } },
      select: { fleetNumber: true },
    }),
    getNumberSetting("tracas.fleet.padding"),
    getNumberSetting(
      isGov ? "tracas.fleet.ft.nextNumber" : "tracas.fleet.lv.nextNumber",
    ),
    getBoolSetting("tracas.fleet.fillGaps"),
  ]);

  const pad = padding > 0 ? padding : 3;
  const used = new Set<number>();
  let maxNum = 0;

  for (const v of vehicles) {
    const m = /^([A-Za-z]+)(\d+)$/.exec((v.fleetNumber ?? "").trim());
    if (!m || m[1].toUpperCase() !== prefix) continue;
    const n = Number(m[2]);
    used.add(n);
    if (n > maxNum) maxNum = n;
  }

  let candidate: number;

  if (fillGaps) {
    candidate = 1;
    while (used.has(candidate)) candidate++;
  } else {
    // An override of 0 means "carry on from the highest in use".
    candidate = override > 0 ? override : maxNum + 1;
    // Never collide, even if the override points at an occupied number.
    while (used.has(candidate)) candidate++;
  }

  return `${prefix}${candidate.toString().padStart(pad, "0")}`;
}

async function generateDriverSecurityCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await db.tracasDriver.findFirst({ where: { securityCode: code } });
    if (!existing) return code;
    attempts++;
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function generateUniqueAuthorityRef(): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const ref = `TRAC-${randomNum}-AN`;
    const existing = await db.tracasVehicle.findUnique({ where: { authorityRef: ref } });
    if (!existing) return ref;
    attempts++;
  }
  return `TRAC-${Date.now().toString().slice(-6)}-AN`;
}

// ─── Vehicle Actions ──────────────────────────────────────────────────────

export async function onboardTracasVehicle(input: OnboardTracasVehicleInput) {
  try {
    // Onboarding is the Enumerator's job; other staff are read-only.
    const authz = await authorize(FLEET_WRITE_ROLES);
    if (!authz.ok) return { success: false, error: authz.error };

    if (!input.registrationNumber?.trim()) {
      return { success: false, error: "Registration Number is required." };
    }

    const regNo = input.registrationNumber.trim();

    // Enrolment status and ownership decide the fleet-number prefix (FT vs LV).
    // They previously defaulted silently, so an enumerator who skipped past
    // them got a government FT number on a private vehicle — a mistake that
    // then needs a data migration to unpick. Both are now mandatory and must
    // be an explicit, recognised value.
    const VALID_OWNERSHIP = [
      "GOVERNMENT_OWNED",
      "INDIVIDUAL",
      "COLLABORATIVE",
    ];
    const VALID_ENROLLMENT = ["EXISTING", "NEW_JOINER"];

    const ownershipType = input.ownershipType?.trim() ?? "";
    if (!VALID_OWNERSHIP.includes(ownershipType)) {
      return {
        success: false,
        error:
          "Select a Vehicle Ownership Type — this determines the fleet number prefix (FT for state fleet, LV for private).",
      };
    }

    const enrollmentType = input.enrollmentType?.trim() ?? "";
    if (!VALID_ENROLLMENT.includes(enrollmentType)) {
      return {
        success: false,
        error:
          "Select an Enrolment Status — whether the vehicle already operates under TRACAS or is joining now.",
      };
    }

    // The Letter of Authority expiry is driven by the particulars expiry, so
    // both particulars dates are required at onboarding.
    if (!input.particularsIssueDate) {
      return { success: false, error: "Particulars Issue Date is required." };
    }
    if (!input.particularsExpiryDate) {
      return { success: false, error: "Particulars Expiry Date is required." };
    }

    const particularsIssue = new Date(input.particularsIssueDate);
    const particularsExpiry = new Date(input.particularsExpiryDate);
    if (isNaN(particularsIssue.getTime()) || isNaN(particularsExpiry.getTime())) {
      return { success: false, error: "Particulars dates are invalid." };
    }
    if (particularsExpiry <= particularsIssue) {
      return {
        success: false,
        error: "Particulars Expiry Date must be after the Issue Date.",
      };
    }

    const fleetNo = input.fleetNumber?.trim() || (await generateNextFleetNumber(ownershipType));

    const existingReg = await db.tracasVehicle.findUnique({ where: { registrationNumber: regNo } });
    if (existingReg) {
      return { success: false, error: `Vehicle with registration '${regNo}' already exists.` };
    }

    const existingFleet = await db.tracasVehicle.findUnique({ where: { fleetNumber: fleetNo } });
    if (existingFleet) {
      return { success: false, error: `Vehicle with fleet number '${fleetNo}' already exists.` };
    }

    // A driver already operating a vehicle cannot be attached to another.
    if (input.assignedDriverId) {
      const driverConflict = await db.tracasVehicle.findFirst({
        where: { assignedDriverId: input.assignedDriverId },
        select: { registrationNumber: true, fleetNumber: true },
      });
      if (driverConflict) {
        return {
          success: false,
          error: `That driver is already assigned to ${driverConflict.registrationNumber} (${driverConflict.fleetNumber}). Choose an unassigned driver.`,
        };
      }
    }

    const authorityRef = input.authorityRef?.trim() || (await generateUniqueAuthorityRef());

    if (ownershipType !== "GOVERNMENT_OWNED") {
      if (!input.ownerName?.trim()) {
        return { success: false, error: "Vehicle Owner Name is required for private/collaborative vehicles." };
      }
      if (!input.ownerPhone?.trim()) {
        return { success: false, error: "Vehicle Owner Phone is required for private/collaborative vehicles." };
      }
    }

    const vehicle = await db.tracasVehicle.create({
      data: {
        registrationNumber: regNo,
        fleetNumber: fleetNo,
        category: input.category || "BUS",
        capacity:
          input.capacity === undefined || input.capacity === ""
            ? null
            : Number(input.capacity) || null,
        makeModel: input.makeModel || null,
        engineNumber: input.engineNumber || null,
        chassisNumber: input.chassisNumber || null,
        insuranceCertificateNo: input.insuranceCertificateNo || null,
        insuranceCommencement: input.insuranceCommencement ? new Date(input.insuranceCommencement) : null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        particularsIssueDate: particularsIssue,
        particularsExpiryDate: particularsExpiry,
        assignedRoute: input.assignedRoute || null,
        ownershipType: ownershipType,
        enrollmentType: enrollmentType,
        // Only new joiners carry a join date; existing vehicles predate enrolment.
        joinedCompanyAt:
          enrollmentType === "NEW_JOINER"
            ? input.joinedCompanyAt
              ? new Date(input.joinedCompanyAt)
              : new Date()
            : null,
        ownerName: input.ownerName?.trim() || null,
        ownerPhone: input.ownerPhone?.trim() || null,
        ownerAddress: input.ownerAddress?.trim() || null,
        ownerNIN: input.ownerNIN?.trim() || null,
        authorityRef: authorityRef,
        authorityIssueDate: input.authorityIssueDate ? new Date(input.authorityIssueDate) : new Date(),
        authorityExpiryDate: input.authorityExpiryDate ? new Date(input.authorityExpiryDate) : null,
        assignedDriverId: input.assignedDriverId || null,
      },
    });


    if (input.stickerId) {
      await db.tracasSticker.update({
        where: { id: input.stickerId },
        data: {
          isAssigned: true,
          assignedVehicleId: vehicle.id,
          assignedAt: new Date(),
        },
      });
    }

    await recordAudit({
      action: "TRACAS_VEHICLE_ONBOARDED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicle.id,
      changeDescription: `Onboarded ${vehicle.registrationNumber} (${vehicle.fleetNumber}) as ${enrollmentType} / ${ownershipType}`,
      newValues: {
        registrationNumber: vehicle.registrationNumber,
        fleetNumber: vehicle.fleetNumber,
        ownershipType,
        enrollmentType,
        authorityRef: vehicle.authorityRef,
        assignedDriverId: vehicle.assignedDriverId,
      },
    });

    revalidatePath("/tracas");
    return { success: true, data: vehicle };
  } catch (error: any) {
    console.error("Error onboarding TRACAS vehicle:", error);
    return { success: false, error: error?.message || "Failed to onboard vehicle." };
  }
}

export async function assignStickerToTracasVehicle(
  vehicleId: string,
  stickerIdentifier: string | null
) {
  try {
    // Sticker binding is part of onboarding.
    const authz = await authorize(FLEET_WRITE_ROLES);
    if (!authz.ok) return { success: false, error: authz.error };

    // Unassign existing sticker on this vehicle if any
    const existingVehicleSticker = await db.tracasSticker.findUnique({
      where: { assignedVehicleId: vehicleId },
    });
    const previousStickerCode = existingVehicleSticker?.stickerCode ?? null;
    if (existingVehicleSticker) {
      await db.tracasSticker.update({
        where: { id: existingVehicleSticker.id },
        data: { isAssigned: false, assignedVehicleId: null, assignedAt: null },
      });
    }

    if (stickerIdentifier && stickerIdentifier.trim() !== "") {
      const rawInput = stickerIdentifier.trim();

      // Reduce a scanned URL to its bare code. Handles every issuing host,
      // including transpaytms — the old inline check only matched
      // "/v/tracas/" and so stored whole URLs in stickerCode.
      const extractedCode = extractStickerCode(rawInput);

      // Find sticker by ID, code, or URL
      let sticker = await db.tracasSticker.findFirst({
        where: {
          OR: [
            { id: rawInput },
            { stickerCode: extractedCode },
            { stickerUrl: rawInput },
          ],
        },
      });

      // If sticker does not exist in pool, create it dynamically
      if (!sticker) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8150";
        const stickerUrl = rawInput.startsWith("http")
          ? rawInput
          : `${baseUrl}/v/tracas/${extractedCode}`;

        sticker = await db.tracasSticker.create({
          data: {
            stickerCode: extractedCode,
            stickerUrl: stickerUrl,
            isAssigned: true,
            assignedVehicleId: vehicleId,
            assignedAt: new Date(),
          },
        });
      } else {
        await db.tracasSticker.update({
          where: { id: sticker.id },
          data: {
            isAssigned: true,
            assignedVehicleId: vehicleId,
            assignedAt: new Date(),
          },
        });
      }
    }

    await recordAudit({
      action: stickerIdentifier ? "TRACAS_STICKER_BOUND" : "TRACAS_STICKER_UNBOUND",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: stickerIdentifier
        ? `Bound sticker to vehicle ${vehicleId}`
        : `Unbound sticker from vehicle ${vehicleId}`,
      oldValues: previousStickerCode ? { stickerCode: previousStickerCode } : undefined,
      newValues: stickerIdentifier ? { scanned: stickerIdentifier } : null,
    });

    revalidatePath("/tracas");
    return { success: true };
  } catch (error: any) {
    console.error("Error assigning sticker to vehicle:", error);
    return {
      success: false,
      error: error?.message || "Failed to assign sticker.",
    };
  }
}

export async function reassignTracasDriver(vehicleId: string, driverId: string | null) {
  try {
    // Two different operations share this action:
    //
    //   * Initial assignment — the vehicle has no driver yet. This is part of
    //     onboarding, so it follows the same write roles as onboarding itself.
    //   * Reassignment or removal — the vehicle already has a driver. This
    //     moves a driver between vehicles and invalidates an issued Letter of
    //     Authority, so it is restricted to the two administrative roles.
    const current = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { assignedDriverId: true, registrationNumber: true },
    });
    if (!current) {
      return { success: false, error: "Vehicle not found." };
    }

    const isInitialAssignment = !current.assignedDriverId && !!driverId;

    const authz = await authorize(
      isInitialAssignment ? FLEET_WRITE_ROLES : ["SYSTEM_ADMIN", "ADMIN"],
    );
    if (!authz.ok) {
      return {
        success: false,
        error: isInitialAssignment
          ? authz.error
          : "You do not have permission to reassign or remove a vehicle driver.",
      };
    }

    // A driver may only hold one vehicle at a time.
    if (driverId) {
      const conflict = await db.tracasVehicle.findFirst({
        where: { assignedDriverId: driverId, id: { not: vehicleId } },
        select: { registrationNumber: true, fleetNumber: true },
      });
      if (conflict) {
        return {
          success: false,
          error: `That driver is already assigned to ${conflict.registrationNumber} (${conflict.fleetNumber}). Unassign them there first.`,
        };
      }
    }

    const updated = await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: { assignedDriverId: driverId },
    });

    await recordAudit({
      action: !driverId
        ? "TRACAS_DRIVER_UNASSIGNED"
        : isInitialAssignment
          ? "TRACAS_DRIVER_ASSIGNED"
          : "TRACAS_DRIVER_REASSIGNED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `Driver ${
        !driverId
          ? "removed from"
          : isInitialAssignment
            ? "assigned to"
            : "reassigned on"
      } ${current.registrationNumber}`,
      oldValues: { assignedDriverId: current.assignedDriverId },
      newValues: { assignedDriverId: driverId },
    });

    revalidatePath("/tracas");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error reassigning TRACAS driver:", error);
    return { success: false, error: error?.message || "Failed to reassign driver." };
  }
}

// ─── Driver Actions ───────────────────────────────────────────────────────

export async function onboardTracasDriver(input: OnboardTracasDriverInput) {
  try {
    // Driver enumeration is the Enumerator's job.
    const authz = await authorize(FLEET_WRITE_ROLES);
    if (!authz.ok) return { success: false, error: authz.error };

    if (!input.fullName?.trim()) {
      return { success: false, error: "Full Name is required." };
    }
    if (!input.phoneNumber?.trim()) {
      return { success: false, error: "Phone Number is required." };
    }
    if (!input.licenseExpiryDate) {
      return { success: false, error: "License Expiry Date is compulsory." };
    }

    if (input.licenseNumber?.trim()) {
      const existingLic = await db.tracasDriver.findUnique({
        where: { licenseNumber: input.licenseNumber.trim() },
      });
      if (existingLic) {
        return { success: false, error: `Driver with license '${input.licenseNumber.trim()}' already exists.` };
      }
    }

    // Photographs live in object storage; the column holds a URL. See
    // lib/media-url.ts — embedding images here once cost us 198 MB.
    const photoProblem = checkStoredUrl(input.photoUrl, "Driver photograph");
    if (photoProblem) return { success: false, error: photoProblem };

    const securityCode = await generateDriverSecurityCode();

    const driver = await db.tracasDriver.create({
      data: {
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        securityCode: securityCode,
        email: input.email || null,
        photoUrl: input.photoUrl || null,
        nin: input.nin || null,
        asinNumber: input.asinNumber || null,
        residentialAddress: input.residentialAddress || null,
        stateOfOrigin: input.stateOfOrigin || null,
        lga: input.lga || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender || null,
        bloodGroup: input.bloodGroup || null,
        maritalStatus: input.maritalStatus || null,
        educationalQualification: input.educationalQualification || null,
        nextOfKinName: input.nextOfKinName || null,
        nextOfKinPhone: input.nextOfKinPhone || null,
        emergencyContactName: input.emergencyContactName || null,
        emergencyContactPhone: input.emergencyContactPhone || null,
        guarantorName: input.guarantorName || null,
        guarantorPhone: input.guarantorPhone || null,
        guarantorAddress: input.guarantorAddress || null,
        licenseNumber: input.licenseNumber?.trim() || null,
        licenseIssueDate: input.licenseIssueDate ? new Date(input.licenseIssueDate) : null,
        licenseExpiryDate: input.licenseExpiryDate ? new Date(input.licenseExpiryDate) : null,
        operatorAssociation: input.operatorAssociation || null,
        notes: input.notes || null,
      },
    });

    await recordAudit({
      action: "TRACAS_DRIVER_ONBOARDED",
      entityType: "TRACAS_DRIVER",
      entityId: driver.id,
      changeDescription: `Enumerated TRACAS driver ${driver.fullName}`,
      newValues: {
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        licenseNumber: driver.licenseNumber,
        securityCode: driver.securityCode,
      },
    });

    revalidatePath("/tracas");
    return { success: true, data: driver };
  } catch (error: any) {
    console.error("Error onboarding TRACAS driver:", error);
    return { success: false, error: error?.message || "Failed to onboard driver." };
  }
}

export async function getTracasDriverData(identifier: string) {
  try {
    let driver = await db.tracasDriver.findFirst({
      where: {
        OR: [
          { id: identifier },
          { securityCode: identifier },
          { licenseNumber: identifier },
        ],
      },
      include: {
        vehicles: {
          select: { id: true, registrationNumber: true, fleetNumber: true },
        },
      },
    });

    if (driver && !driver.securityCode) {
      // Lazy migration for legacy drivers missing a 4-digit security code
      const newSecCode = await generateDriverSecurityCode();
      driver = await db.tracasDriver.update({
        where: { id: driver.id },
        data: { securityCode: newSecCode },
        include: {
          vehicles: {
            select: { id: true, registrationNumber: true, fleetNumber: true },
          },
        },
      });
    }

    if (!driver) {
      return { success: false, error: "TRACAS driver record not found." };
    }

    return { success: true, driver };
  } catch (error: any) {
    console.error("Error fetching TRACAS driver data:", error);
    return { success: false, error: "Failed to load driver details." };
  }
}

// ─── Fetch Fleet & Authority Letter Data ─────────────────────────────────

/**
 * Everything the TRACAS hub renders, in one round trip.
 *
 * This used to run three sequential `include`-everything queries, which pulled
 * every column of every row — including TracasDriver.photoUrl, where photos
 * were stored as base64. That made a single page load transfer ~280 MB and
 * take around two minutes.
 *
 * Two changes: the queries run together rather than one after another, and
 * each one names the columns it needs. `photoUrl` is included because it is
 * rendered as an avatar, but see scripts/migrate-driver-photos.ts — it must
 * hold a URL, not an embedded image, or this page is slow again.
 */
/**
 * One page of the TRACAS hub.
 *
 * Only the ACTIVE tab is queried — opening the fleet no longer reads every
 * driver and sticker as well. Search and the enrolment filter run in the
 * database, so they cover the whole register rather than whichever rows
 * happened to be loaded.
 *
 * The assignment pools (unassigned drivers, unassigned stickers) are fetched
 * in full: both are naturally small, and a dialog that only offered the
 * current page would be wrong.
 */
export async function getTracasFleetData(params?: {
  tab?: TracasTabKey;
  page?: number;
  search?: string;
  enrollment?: "ALL" | "EXISTING" | "NEW_JOINER";
}) {
  const tab: TracasTabKey = params?.tab ?? "vehicles";
  const page = Math.max(1, params?.page ?? 1);
  const search = (params?.search ?? "").trim();
  const enrollment = params?.enrollment ?? "ALL";
  const skip = (page - 1) * TRACAS_PAGE_SIZE;

  try {
    const vehicleWhere: Prisma.TracasVehicleWhereInput = {
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: "insensitive" as const } },
              { fleetNumber: { contains: search, mode: "insensitive" as const } },
              { authorityRef: { contains: search, mode: "insensitive" as const } },
              {
                assignedDriver: {
                  fullName: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
      // Rows written before enrollmentType existed count as EXISTING.
      ...(enrollment === "NEW_JOINER"
        ? { enrollmentType: "NEW_JOINER" }
        : enrollment === "EXISTING"
          ? { NOT: { enrollmentType: "NEW_JOINER" } }
          : {}),
    };

    const driverWhere: Prisma.TracasDriverWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phoneNumber: { contains: search } },
            { licenseNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const stickerWhere: Prisma.TracasStickerWhereInput = search
      ? {
          OR: [
            { stickerUrl: { contains: search, mode: "insensitive" as const } },
            { stickerCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const VEHICLE_SELECT = {
      id: true,
      registrationNumber: true,
      fleetNumber: true,
      category: true,
      capacity: true,
      ownershipType: true,
      enrollmentType: true,
      joinedCompanyAt: true,
      status: true,
      letterStatus: true,
      authorityRef: true,
      authorityIssueDate: true,
      authorityExpiryDate: true,
      particularsIssueDate: true,
      particularsExpiryDate: true,
      assignedRoute: true,
      ownerName: true,
      ownerPhone: true,
      createdAt: true,
      assignedDriverId: true,
      assignedDriver: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          photoUrl: true,
          securityCode: true,
          idCardStatus: true,
        },
      },
      sticker: { select: { id: true, stickerCode: true, stickerUrl: true } },
    };

    const DRIVER_SELECT = {
      id: true,
      fullName: true,
      phoneNumber: true,
      photoUrl: true,
      securityCode: true,
      licenseNumber: true,
      licenseIssueDate: true,
      licenseExpiryDate: true,
      operatorAssociation: true,
      status: true,
      idCardStatus: true,
      residentialAddress: true,
      nextOfKinName: true,
      nextOfKinPhone: true,
      createdAt: true,
      vehicles: {
        select: { id: true, registrationNumber: true, fleetNumber: true },
      },
    };

    const STICKER_SELECT = {
      id: true,
      stickerUrl: true,
      stickerCode: true,
      isAssigned: true,
      assignedAt: true,
      createdAt: true,
      assignedVehicle: {
        select: { id: true, registrationNumber: true, fleetNumber: true },
      },
    };

    const [
      vehicles,
      drivers,
      stickers,
      filteredCount,
      vehicleTotal,
      driverTotal,
      stickerTotal,
      newJoinerCount,
      activeVehicleCount,
      availableDrivers,
      availableStickers,
    ] = await Promise.all([
      tab === "vehicles"
        ? db.tracasVehicle.findMany({
            where: vehicleWhere,
            select: VEHICLE_SELECT,
            orderBy: { createdAt: "desc" },
            skip,
            take: TRACAS_PAGE_SIZE,
          })
        : Promise.resolve([]),
      tab === "drivers"
        ? db.tracasDriver.findMany({
            where: driverWhere,
            select: DRIVER_SELECT,
            orderBy: { createdAt: "desc" },
            skip,
            take: TRACAS_PAGE_SIZE,
          })
        : Promise.resolve([]),
      tab === "stickers"
        ? db.tracasSticker.findMany({
            where: stickerWhere,
            select: STICKER_SELECT,
            orderBy: { createdAt: "desc" },
            skip,
            take: TRACAS_PAGE_SIZE,
          })
        : Promise.resolve([]),

      // Rows matching the current filters — drives the pager.
      tab === "vehicles"
        ? db.tracasVehicle.count({ where: vehicleWhere })
        : tab === "drivers"
          ? db.tracasDriver.count({ where: driverWhere })
          : db.tracasSticker.count({ where: stickerWhere }),

      // Headline figures are counts, not row reads.
      db.tracasVehicle.count(),
      db.tracasDriver.count(),
      db.tracasSticker.count(),
      db.tracasVehicle.count({ where: { enrollmentType: "NEW_JOINER" } }),
      db.tracasVehicle.count({ where: { status: "ACTIVE" } }),

      // Assignment pools. Small by definition — a driver leaves the pool the
      // moment they hold a vehicle, and a sticker the moment it is assigned.
      db.tracasDriver.findMany({
        where: { vehicles: { none: {} } },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          securityCode: true,
          photoUrl: true,
        },
        orderBy: { fullName: "asc" },
        take: MAX_LIST_ROWS,
      }),
      db.tracasSticker.findMany({
        where: { isAssigned: false },
        select: { id: true, stickerCode: true, stickerUrl: true, isAssigned: true },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
    ]);

    return {
      success: true,
      vehicles,
      drivers,
      stickers,
      pools: { availableDrivers, availableStickers },
      stats: {
        vehicleTotal,
        driverTotal,
        stickerTotal,
        newJoinerCount,
        activeVehicleCount,
        availableStickerCount: availableStickers.length,
      },
      pagination: {
        tab,
        page,
        pageSize: TRACAS_PAGE_SIZE,
        total: filteredCount,
        totalPages: Math.max(1, Math.ceil(filteredCount / TRACAS_PAGE_SIZE)),
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching TRACAS fleet data:", error);
    return { success: false as const, error: "Failed to load TRACAS data." };
  }
}

export async function getTracasAuthorityLetterData(identifier: string) {
  try {
    const vehicle = await db.tracasVehicle.findFirst({
      where: {
        OR: [
          { id: identifier },
          { authorityRef: identifier },
          { registrationNumber: identifier },
          { fleetNumber: identifier },
        ],
      },
      include: {
        assignedDriver: true,
        sticker: true,
      },
    });

    if (!vehicle) {
      return { success: false, error: "TRACAS vehicle record not found." };
    }

    return { success: true, vehicle };
  } catch (error: any) {
    console.error("Error fetching TRACAS authority letter:", error);
    return { success: false, error: "Failed to load authority letter." };
  }
}

export async function getPublicTracasVerification(identifier: string) {
  return getTracasAuthorityLetterData(identifier);
}

/**
 * Edit an enumerated TRACAS driver's profile, including their passport photo.
 *
 * System Admin only. Enumerators capture drivers at onboarding; correcting a
 * record afterwards changes what is printed on an issued ID card and named on
 * a Letter of Authority, so it is deliberately a narrower permission.
 */
export async function updateTracasDriver(
  driverId: string,
  input: Partial<OnboardTracasDriverInput> & { status?: string },
) {
  try {
    const authz = await authorize(["SYSTEM_ADMIN", "ADMIN"]);
    if (!authz.ok) {
      return {
        success: false,
        error: "You do not have permission to edit a driver's profile.",
      };
    }

    const existing = await db.tracasDriver.findUnique({
      where: { id: driverId },
    });
    if (!existing) {
      return { success: false, error: "Driver not found." };
    }

    if (input.fullName !== undefined && !input.fullName.trim()) {
      return { success: false, error: "Full name cannot be empty." };
    }
    if (input.phoneNumber !== undefined && !input.phoneNumber.trim()) {
      return { success: false, error: "Phone number cannot be empty." };
    }

    // Licence numbers are unique — reject a clash before Prisma throws.
    const nextLicense = input.licenseNumber?.trim().toUpperCase() || null;
    if (nextLicense && nextLicense !== existing.licenseNumber) {
      const clash = await db.tracasDriver.findFirst({
        where: { licenseNumber: nextLicense, id: { not: driverId } },
        select: { fullName: true },
      });
      if (clash) {
        return {
          success: false,
          error: `Licence number '${nextLicense}' already belongs to ${clash.fullName}.`,
        };
      }
    }

    const str = (v: string | undefined) =>
      v === undefined ? undefined : v.trim() || null;
    const date = (v: string | undefined) =>
      v === undefined ? undefined : v ? new Date(v) : null;

    const photoProblem = checkStoredUrl(input.photoUrl, "Driver photograph");
    if (photoProblem) return { success: false, error: photoProblem };

    const data = {
      fullName: input.fullName?.trim(),
      phoneNumber: input.phoneNumber?.trim(),
      email: str(input.email),
      photoUrl: str(input.photoUrl),
      nin: str(input.nin),
      asinNumber: str(input.asinNumber),
      residentialAddress: str(input.residentialAddress),
      stateOfOrigin: str(input.stateOfOrigin),
      lga: str(input.lga),
      dateOfBirth: date(input.dateOfBirth),
      gender: str(input.gender),
      bloodGroup: str(input.bloodGroup),
      maritalStatus: str(input.maritalStatus),
      educationalQualification: str(input.educationalQualification),
      nextOfKinName: str(input.nextOfKinName),
      nextOfKinPhone: str(input.nextOfKinPhone),
      emergencyContactName: str(input.emergencyContactName),
      emergencyContactPhone: str(input.emergencyContactPhone),
      guarantorName: str(input.guarantorName),
      guarantorPhone: str(input.guarantorPhone),
      guarantorAddress: str(input.guarantorAddress),
      licenseNumber: nextLicense ?? undefined,
      licenseIssueDate: date(input.licenseIssueDate),
      licenseExpiryDate: date(input.licenseExpiryDate),
      operatorAssociation: str(input.operatorAssociation),
      notes: str(input.notes),
      ...(input.status === "ACTIVE" ||
      input.status === "SUSPENDED" ||
      input.status === "REVOKED" ||
      input.status === "EXPIRED"
        ? { status: input.status }
        : {}),
    };

    // Drop untouched keys so a partial edit never blanks a field.
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const driver = await db.tracasDriver.update({
      where: { id: driverId },
      data: cleaned,
    });

    // Record which fields actually moved, rather than the whole row —
    // driver photos are base64 data URIs and would bloat the audit log.
    const changed = Object.keys(cleaned).filter((k) => {
      const before = (existing as Record<string, unknown>)[k];
      const after = (cleaned as Record<string, unknown>)[k];
      const norm = (v: unknown) =>
        v instanceof Date ? v.toISOString() : (v ?? null);
      return norm(before) !== norm(after);
    });

    await recordAudit({
      action: "TRACAS_DRIVER_UPDATED",
      entityType: "TRACAS_DRIVER",
      entityId: driverId,
      changeDescription: changed.length
        ? `Updated ${driver.fullName}: ${changed.join(", ")}`
        : `No effective change to ${driver.fullName}`,
      oldValues: { fields: changed },
      newValues: {
        fields: changed,
        photoReplaced: changed.includes("photoUrl"),
      },
    });

    revalidatePath("/tracas");
    revalidatePath(`/tracas/driver/${driverId}/id-card`);
    return { success: true, data: driver };
  } catch (error: any) {
    console.error("Error updating TRACAS driver:", error);
    return {
      success: false,
      error: error?.message || "Failed to update driver.",
    };
  }
}

// ─── Vehicle Detail & Editing ─────────────────────────────────────────────

/**
 * Full record for the vehicle detail page.
 * Readable by any Ministry role with fleet visibility.
 */
export async function getTracasVehicleDetail(vehicleId: string) {
  const authz = await authorize(FLEET_VIEW_ROLES);
  if (!authz.ok) return { success: false as const, error: authz.error };

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      include: {
        assignedDriver: true,
        sticker: true,
      },
    });
    if (!vehicle) {
      return { success: false as const, error: "Vehicle not found." };
    }
    return { success: true as const, data: vehicle };
  } catch (error: any) {
    console.error("getTracasVehicleDetail failed:", error);
    return { success: false as const, error: "Failed to load the vehicle." };
  }
}

export interface UpdateTracasVehicleInput {
  registrationNumber?: string;
  category?: string;
  capacity?: number | string;
  makeModel?: string;
  engineNumber?: string;
  chassisNumber?: string;
  insuranceCertificateNo?: string;
  insuranceCommencement?: string;
  insuranceExpiry?: string;
  particularsIssueDate?: string;
  particularsExpiryDate?: string;
  assignedRoute?: string;
  ownershipType?: string;
  enrollmentType?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerNIN?: string;
  status?: string;
}

/**
 * Amend an onboarded vehicle.
 *
 * Restricted to Enumerators and System Admins — narrower than onboarding,
 * because these fields are printed on an issued Letter of Authority.
 *
 * Note: fleetNumber and authorityRef are deliberately NOT editable here.
 * Fleet numbers are positional across the whole register (see
 * fix-fleet-numbering.ts) and the authority ref is printed on circulating
 * letters, so neither can be changed safely from a single-record form.
 */
export async function updateTracasVehicle(
  vehicleId: string,
  input: UpdateTracasVehicleInput,
) {
  try {
    const authz = await authorize(FLEET_EDIT_ROLES);
    if (!authz.ok) {
      return {
        success: false,
        error: "You do not have permission to edit a vehicle record.",
      };
    }

    const existing = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!existing) return { success: false, error: "Vehicle not found." };

    // Registration must stay unique across the register.
    const nextReg = input.registrationNumber?.trim().toUpperCase();
    if (nextReg && nextReg !== existing.registrationNumber.toUpperCase()) {
      const clash = await db.tracasVehicle.findFirst({
        where: { registrationNumber: nextReg, id: { not: vehicleId } },
        select: { fleetNumber: true },
      });
      if (clash) {
        return {
          success: false,
          error: `Registration '${nextReg}' already belongs to ${clash.fleetNumber}.`,
        };
      }
    }

    // Ownership and enrolment keep their mandatory, explicit values.
    if (
      input.ownershipType !== undefined &&
      !["GOVERNMENT_OWNED", "INDIVIDUAL", "COLLABORATIVE"].includes(
        input.ownershipType,
      )
    ) {
      return { success: false, error: "Select a valid Vehicle Ownership Type." };
    }
    if (
      input.enrollmentType !== undefined &&
      !["EXISTING", "NEW_JOINER"].includes(input.enrollmentType)
    ) {
      return { success: false, error: "Select a valid Enrolment Status." };
    }

    // Particulars drive the letter's expiry, so they stay required and ordered.
    const issue = input.particularsIssueDate
      ? new Date(input.particularsIssueDate)
      : existing.particularsIssueDate;
    const expiry = input.particularsExpiryDate
      ? new Date(input.particularsExpiryDate)
      : existing.particularsExpiryDate;
    if (issue && expiry && expiry <= issue) {
      return {
        success: false,
        error: "Particulars Expiry Date must be after the Issue Date.",
      };
    }

    const str = (v: string | undefined) =>
      v === undefined ? undefined : v.trim() || null;
    const date = (v: string | undefined) =>
      v === undefined ? undefined : v ? new Date(v) : null;

    const data = {
      registrationNumber: nextReg,
      category: str(input.category) ?? undefined,
      capacity:
        input.capacity === undefined
          ? undefined
          : input.capacity === ""
            ? null
            : Number(input.capacity) || null,
      makeModel: str(input.makeModel),
      engineNumber: str(input.engineNumber),
      chassisNumber: str(input.chassisNumber),
      insuranceCertificateNo: str(input.insuranceCertificateNo),
      insuranceCommencement: date(input.insuranceCommencement),
      insuranceExpiry: date(input.insuranceExpiry),
      particularsIssueDate: date(input.particularsIssueDate),
      particularsExpiryDate: date(input.particularsExpiryDate),
      assignedRoute: str(input.assignedRoute),
      ownershipType: input.ownershipType,
      enrollmentType: input.enrollmentType,
      ownerName: str(input.ownerName),
      ownerPhone: str(input.ownerPhone),
      ownerAddress: str(input.ownerAddress),
      ownerNIN: str(input.ownerNIN),
      ...(input.status &&
      ["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"].includes(input.status)
        ? { status: input.status as any }
        : {}),
    };

    // Drop untouched keys so a partial edit never blanks a field.
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const updated = await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: cleaned,
    });

    const norm = (v: unknown) =>
      v instanceof Date ? v.toISOString() : (v ?? null);
    const changed = Object.keys(cleaned).filter(
      (k) =>
        norm((existing as Record<string, unknown>)[k]) !==
        norm((cleaned as Record<string, unknown>)[k]),
    );

    await recordAudit({
      action: "TRACAS_VEHICLE_UPDATED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: changed.length
        ? `Updated ${existing.registrationNumber} (${existing.fleetNumber}): ${changed.join(", ")}`
        : `No effective change to ${existing.registrationNumber}`,
      oldValues: Object.fromEntries(
        changed.map((k) => [k, norm((existing as Record<string, unknown>)[k])]),
      ),
      newValues: Object.fromEntries(
        changed.map((k) => [k, norm((cleaned as Record<string, unknown>)[k])]),
      ),
    });

    revalidatePath("/tracas");
    revalidatePath(`/tracas/${vehicleId}`);
    revalidatePath(`/tracas/${vehicleId}/letter`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateTracasVehicle failed:", error);
    return {
      success: false,
      error: error?.message || "Failed to update the vehicle.",
    };
  }
}
