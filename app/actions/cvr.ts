"use server";

/**
 * CVR (Commercial Vehicle Registration) — Server Actions
 *
 * Stage 1: createCvrRegistration — vehicle + owner + driver + operational info
 * Stage 2: assignCvrVin — generates and writes the VIN (designated roles only)
 *
 * All mutating actions call authorize() with the effective role set before
 * touching the database. Role sets are resolved from SystemConfiguration at
 * runtime so no deployment is needed when an admin changes access.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getCvrWriteRoles, getCvrViewRoles, getCvrVinRoles } from "@/lib/cvr-roles";
import type {
  CvrVehicleCategory,
  CvrOperationType,
  CvrRegistrationStatus,
} from "@prisma/client";

// ─── Input types ────────────────────────────────────────────────────────────

export interface CvrVehicleInput {
  // Vehicle Information
  plateNumber: string;
  chassisNumber: string;
  category: CvrVehicleCategory;
  make?: string;
  model?: string;
  year?: string;
  vehicleType?: string;
  asinNumber?: string;
  tCode?: string;
  color?: string;
  vehicleStatus?: string;
  stickerNumber?: string;
  // Owner Information (all optional per spec)
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerGender?: string;
  ownerMaritalStatus?: string;
  ownerWhatsApp?: string;
  // Operational Information
  operationType?: CvrOperationType;
  townId?: string;
  lgaId?: string;
  fromTownId?: string;
  toTownId?: string;
}

export interface CvrDriverInput {
  fullName: string;
  residentialAddress: string;
  phoneNumber: string;
  gender: string;
  state?: string;
  city?: string;
  nokFullName?: string;
  nokPhoneNumber?: string;
  nokRelationship?: string;
  passportPhotoUrl?: string;
}

export interface CreateCvrRegistrationInput {
  vehicle: CvrVehicleInput;
  driver?: CvrDriverInput;
}

// ─── VIN generation ──────────────────────────────────────────────────────────

const CATEGORY_LETTER: Record<CvrVehicleCategory, string> = {
  BUS: "B",
  SHUTTLE_BUS: "B",
  MINIBUS: "B",
  TRUCK: "T",
  TRICYCLE: "K",
  OTHER: "X",
};

/**
 * Generates the next VIN for the given LGA, Town and category.
 * Format: MOT/<LGA>/<Town>/<serial 3-padded><categoryLetter>
 * e.g. MOT/Awka South/Awka/001B
 *
 * Serial is scoped to (LGA, Town, category letter) so each combination
 * restarts at 001. The next number is derived from existing VINs to keep
 * things consistent even after manual corrections.
 */
async function generateVin(
  lgaName: string,
  townName: string,
  category: CvrVehicleCategory,
): Promise<string> {
  const letter = CATEGORY_LETTER[category];
  const prefix = `MOT/${lgaName}/${townName}/`;
  // Find the highest serial already in use for this prefix + letter
  const existing = await db.cvrVehicle.findMany({
    where: {
      vin: { startsWith: prefix },
    },
    select: { vin: true },
  });

  let maxSerial = 0;
  const suffixPattern = new RegExp(`^${prefix.replace(/[/]/g, "\\/")}(\\d+)${letter}$`);
  for (const { vin } of existing) {
    if (!vin) continue;
    const m = vin.match(suffixPattern);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSerial) maxSerial = n;
    }
  }

  const serial = String(maxSerial + 1).padStart(3, "0");
  return `${prefix}${serial}${letter}`;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Stage 1: Register a commercial vehicle.
 * Creates CvrVehicle (and optionally CvrDriver) and links them.
 * Sets vehicle status to REGISTERED on success.
 */
export async function createCvrRegistration(input: CreateCvrRegistrationInput): Promise<
  { success: true; vehicleId: string } | { success: false; error: string }
> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  const { vehicle: v, driver: d } = input;

  try {
    // Check for duplicate plate or chassis
    const [existingPlate, existingChassis] = await Promise.all([
      db.cvrVehicle.findUnique({ where: { plateNumber: v.plateNumber }, select: { id: true } }),
      db.cvrVehicle.findUnique({ where: { chassisNumber: v.chassisNumber }, select: { id: true } }),
    ]);
    if (existingPlate) return { success: false, error: `Plate number ${v.plateNumber} is already registered.` };
    if (existingChassis) return { success: false, error: `Chassis number ${v.chassisNumber} is already registered.` };

    // Create driver first if provided
    let driverId: string | undefined;
    if (d) {
      const newDriver = await db.cvrDriver.create({
        data: {
          fullName: d.fullName,
          residentialAddress: d.residentialAddress,
          phoneNumber: d.phoneNumber,
          gender: d.gender,
          state: d.state,
          city: d.city,
          nokFullName: d.nokFullName,
          nokPhoneNumber: d.nokPhoneNumber,
          nokRelationship: d.nokRelationship,
          passportPhotoUrl: d.passportPhotoUrl,
          capturedByUserId: authz.session.userId,
        },
      });
      driverId = newDriver.id;

      await recordAudit({
        action: "CVR_DRIVER_ONBOARDED",
        entityType: "CvrDriver",
        entityId: newDriver.id,
        changeDescription: `Driver "${d.fullName}" registered for CVR`,
      });
    }

    // Create the vehicle
    const vehicle = await db.cvrVehicle.create({
      data: {
        plateNumber: v.plateNumber,
        chassisNumber: v.chassisNumber,
        category: v.category,
        make: v.make,
        model: v.model,
        year: v.year,
        vehicleType: v.vehicleType,
        asinNumber: v.asinNumber,
        tCode: v.tCode,
        color: v.color,
        vehicleStatus: v.vehicleStatus,
        stickerNumber: v.stickerNumber,
        ownerName: v.ownerName,
        ownerPhone: v.ownerPhone,
        ownerAddress: v.ownerAddress,
        ownerGender: v.ownerGender,
        ownerMaritalStatus: v.ownerMaritalStatus,
        ownerWhatsApp: v.ownerWhatsApp,
        operationType: v.operationType,
        townId: v.townId,
        lgaId: v.lgaId,
        fromTownId: v.fromTownId,
        toTownId: v.toTownId,
        assignedDriverId: driverId,
        capturedByUserId: authz.session.userId,
        status: "REGISTERED",
      },
    });

    await recordAudit({
      action: "CVR_VEHICLE_ONBOARDED",
      entityType: "CvrVehicle",
      entityId: vehicle.id,
      changeDescription: `Vehicle ${v.plateNumber} (${v.category}) registered`,
    });

    revalidatePath("/commercial-vehicles");
    revalidatePath("/enumerator");
    return { success: true, vehicleId: vehicle.id };
  } catch (err: unknown) {
    console.error("createCvrRegistration error:", err);
    return { success: false, error: "Failed to register vehicle. Please try again." };
  }
}

/**
 * Stage 2: Assign a Vehicle Identification Number to a registered vehicle.
 * Only roles in cvr.vin.roles (+ SYSTEM_ADMIN) may call this.
 */
export async function assignCvrVin(vehicleId: string): Promise<
  { success: true; vin: string } | { success: false; error: string }
> {
  const vinRoles = await getCvrVinRoles();
  const authz = await authorize(vinRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.cvrVehicle.findUnique({
      where: { id: vehicleId },
      include: { lga: true, town: true },
    });

    if (!vehicle) return { success: false, error: "Vehicle not found." };
    if (vehicle.status === "IDENTIFIED") return { success: false, error: "This vehicle already has a VIN assigned." };
    if (!vehicle.lgaId || !vehicle.townId) {
      return { success: false, error: "Vehicle must have an LGA and Town set before a VIN can be assigned." };
    }
    if (!vehicle.lga || !vehicle.town) {
      return { success: false, error: "LGA or Town record could not be found." };
    }

    const vin = await generateVin(vehicle.lga.name, vehicle.town.name, vehicle.category);

    await db.cvrVehicle.update({
      where: { id: vehicleId },
      data: {
        vin,
        vinAssignedAt: new Date(),
        vinAssignedByUserId: authz.session.userId,
        status: "IDENTIFIED",
      },
    });

    await recordAudit({
      action: "CVR_VIN_ASSIGNED",
      entityType: "CvrVehicle",
      entityId: vehicleId,
      changeDescription: `VIN ${vin} assigned to vehicle ${vehicle.plateNumber}`,
    });

    revalidatePath("/commercial-vehicles");
    revalidatePath(`/commercial-vehicles/${vehicleId}`);
    return { success: true, vin };
  } catch (err: unknown) {
    console.error("assignCvrVin error:", err);
    return { success: false, error: "Failed to assign VIN. Please try again." };
  }
}

/**
 * Create a standalone driver record (without linking to a vehicle immediately).
 */
export async function createCvrDriver(input: CvrDriverInput): Promise<
  { success: true; driverId: string } | { success: false; error: string }
> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const driver = await db.cvrDriver.create({
      data: {
        fullName: input.fullName,
        residentialAddress: input.residentialAddress,
        phoneNumber: input.phoneNumber,
        gender: input.gender,
        state: input.state,
        city: input.city,
        nokFullName: input.nokFullName,
        nokPhoneNumber: input.nokPhoneNumber,
        nokRelationship: input.nokRelationship,
        passportPhotoUrl: input.passportPhotoUrl,
        capturedByUserId: authz.session.userId,
      },
    });

    await recordAudit({
      action: "CVR_DRIVER_ONBOARDED",
      entityType: "CvrDriver",
      entityId: driver.id,
      changeDescription: `Driver "${input.fullName}" created`,
    });

    revalidatePath("/commercial-vehicles");
    return { success: true, driverId: driver.id };
  } catch (err: unknown) {
    console.error("createCvrDriver error:", err);
    return { success: false, error: "Failed to create driver." };
  }
}

/** Assign a driver to a vehicle. */
export async function assignCvrDriver(
  vehicleId: string,
  driverId: string,
): Promise<{ success: boolean; error?: string }> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    await db.cvrVehicle.update({
      where: { id: vehicleId },
      data: { assignedDriverId: driverId },
    });
    await recordAudit({
      action: "CVR_DRIVER_ASSIGNED",
      entityType: "CvrVehicle",
      entityId: vehicleId,
      changeDescription: `Driver ${driverId} assigned`,
    });
    revalidatePath(`/commercial-vehicles/${vehicleId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("assignCvrDriver error:", err);
    return { success: false, error: "Failed to assign driver." };
  }
}

/** Remove driver assignment from a vehicle. */
export async function unassignCvrDriver(vehicleId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    await db.cvrVehicle.update({
      where: { id: vehicleId },
      data: { assignedDriverId: null },
    });
    await recordAudit({
      action: "CVR_DRIVER_UNASSIGNED",
      entityType: "CvrVehicle",
      entityId: vehicleId,
      changeDescription: "Driver unassigned",
    });
    revalidatePath(`/commercial-vehicles/${vehicleId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("unassignCvrDriver error:", err);
    return { success: false, error: "Failed to unassign driver." };
  }
}

/** Swap a vehicle's driver for another. */
export async function reassignCvrDriver(
  vehicleId: string,
  newDriverId: string,
): Promise<{ success: boolean; error?: string }> {
  return assignCvrDriver(vehicleId, newDriverId);
}

/** Update vehicle/owner/operational fields, and optionally driver fields. */
export async function updateCvrVehicle(
  vehicleId: string,
  input: Partial<CvrVehicleInput> & {
    driver?: Partial<CvrDriverInput>;
  },
): Promise<{ success: boolean; error?: string }> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const current = await db.cvrVehicle.findUnique({
      where: { id: vehicleId },
      select: { assignedDriverId: true },
    });

    // If driver details are provided, update existing driver or create new driver
    let newAssignedDriverId: string | undefined = undefined;
    if (input.driver) {
      if (current?.assignedDriverId) {
        await db.cvrDriver.update({
          where: { id: current.assignedDriverId },
          data: {
            ...(input.driver.fullName !== undefined && { fullName: input.driver.fullName }),
            ...(input.driver.residentialAddress !== undefined && { residentialAddress: input.driver.residentialAddress }),
            ...(input.driver.phoneNumber !== undefined && { phoneNumber: input.driver.phoneNumber }),
            ...(input.driver.gender !== undefined && { gender: input.driver.gender }),
            ...(input.driver.state !== undefined && { state: input.driver.state }),
            ...(input.driver.city !== undefined && { city: input.driver.city }),
            ...(input.driver.nokFullName !== undefined && { nokFullName: input.driver.nokFullName }),
            ...(input.driver.nokPhoneNumber !== undefined && { nokPhoneNumber: input.driver.nokPhoneNumber }),
            ...(input.driver.nokRelationship !== undefined && { nokRelationship: input.driver.nokRelationship }),
            ...(input.driver.passportPhotoUrl !== undefined && { passportPhotoUrl: input.driver.passportPhotoUrl }),
          },
        });
      } else if (input.driver.fullName?.trim()) {
        const createdDriver = await db.cvrDriver.create({
          data: {
            fullName: input.driver.fullName.trim(),
            residentialAddress: input.driver.residentialAddress || "Not specified",
            phoneNumber: input.driver.phoneNumber || "Not specified",
            gender: input.driver.gender || "Male",
            state: input.driver.state,
            city: input.driver.city,
            nokFullName: input.driver.nokFullName,
            nokPhoneNumber: input.driver.nokPhoneNumber,
            nokRelationship: input.driver.nokRelationship,
            passportPhotoUrl: input.driver.passportPhotoUrl,
            capturedByUserId: authz.session.userId,
          },
        });
        newAssignedDriverId = createdDriver.id;
      }
    }

    await db.cvrVehicle.update({
      where: { id: vehicleId },
      data: {
        ...(input.plateNumber !== undefined && { plateNumber: input.plateNumber }),
        ...(input.chassisNumber !== undefined && { chassisNumber: input.chassisNumber }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.make !== undefined && { make: input.make }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.year !== undefined && { year: input.year }),
        ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }),
        ...(input.asinNumber !== undefined && { asinNumber: input.asinNumber }),
        ...(input.tCode !== undefined && { tCode: input.tCode }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.vehicleStatus !== undefined && { vehicleStatus: input.vehicleStatus }),
        ...(input.stickerNumber !== undefined && { stickerNumber: input.stickerNumber }),
        ...(input.ownerName !== undefined && { ownerName: input.ownerName }),
        ...(input.ownerPhone !== undefined && { ownerPhone: input.ownerPhone }),
        ...(input.ownerAddress !== undefined && { ownerAddress: input.ownerAddress }),
        ...(input.ownerGender !== undefined && { ownerGender: input.ownerGender }),
        ...(input.ownerMaritalStatus !== undefined && { ownerMaritalStatus: input.ownerMaritalStatus }),
        ...(input.ownerWhatsApp !== undefined && { ownerWhatsApp: input.ownerWhatsApp }),
        ...(input.operationType !== undefined && { operationType: input.operationType }),
        ...(input.townId !== undefined && { townId: input.townId }),
        ...(input.lgaId !== undefined && { lgaId: input.lgaId }),
        ...(input.fromTownId !== undefined && { fromTownId: input.fromTownId }),
        ...(input.toTownId !== undefined && { toTownId: input.toTownId }),
        ...(newAssignedDriverId && { assignedDriverId: newAssignedDriverId }),
      },
    });

    await recordAudit({
      action: "CVR_VEHICLE_UPDATED",
      entityType: "CvrVehicle",
      entityId: vehicleId,
      changeDescription: "Vehicle and associated records updated",
    });

    revalidatePath(`/commercial-vehicles/${vehicleId}`);
    revalidatePath("/commercial-vehicles");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateCvrVehicle error:", err);
    return { success: false, error: "Failed to update vehicle record." };
  }
}

/** Standalone update for a driver record. */
export async function updateCvrDriver(
  driverId: string,
  input: Partial<CvrDriverInput>,
): Promise<{ success: boolean; error?: string }> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    await db.cvrDriver.update({
      where: { id: driverId },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.residentialAddress !== undefined && { residentialAddress: input.residentialAddress }),
        ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.nokFullName !== undefined && { nokFullName: input.nokFullName }),
        ...(input.nokPhoneNumber !== undefined && { nokPhoneNumber: input.nokPhoneNumber }),
        ...(input.nokRelationship !== undefined && { nokRelationship: input.nokRelationship }),
        ...(input.passportPhotoUrl !== undefined && { passportPhotoUrl: input.passportPhotoUrl }),
      },
    });

    await recordAudit({
      action: "CVR_DRIVER_UPDATED",
      entityType: "CvrDriver",
      entityId: driverId,
      changeDescription: "Driver record updated",
    });

    revalidatePath("/commercial-vehicles");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateCvrDriver error:", err);
    return { success: false, error: "Failed to update driver." };
  }
}

// ─── Read actions ─────────────────────────────────────────────────────────────

const CVR_PAGE_SIZE = 25;

export interface CvrVehicleRow {
  id: string;
  plateNumber: string;
  chassisNumber: string;
  category: CvrVehicleCategory;
  make: string | null;
  model: string | null;
  color: string | null;
  status: CvrRegistrationStatus;
  vin: string | null;
  stickerNumber: string | null;
  operationType: CvrOperationType | null;
  lgaName: string | null;
  townName: string | null;
  driverName: string | null;
  capturedByUserId: string;
  createdAt: Date;
}

export interface CvrDriverRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  gender: string;
  state: string | null;
  city: string | null;
  passportPhotoUrl: string | null;
  vehicleCount: number;
  capturedByUserId: string;
  createdAt: Date;
}

export async function getCvrVehicles(opts: {
  page?: number;
  search?: string;
  status?: CvrRegistrationStatus;
}): Promise<
  | {
      success: true;
      vehicles: CvrVehicleRow[];
      stats: { total: number; identified: number; pendingVin: number };
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }
  | { success: false; error: string }
> {
  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  const page = Math.max(1, opts.page ?? 1);
  const search = opts.search?.trim() ?? "";

  try {
    const where = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(search
        ? {
            OR: [
              { plateNumber: { contains: search, mode: "insensitive" as const } },
              { chassisNumber: { contains: search, mode: "insensitive" as const } },
              { ownerName: { contains: search, mode: "insensitive" as const } },
              { stickerNumber: { contains: search, mode: "insensitive" as const } },
              { vin: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total, identified, pendingVin] = await Promise.all([
      db.cvrVehicle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * CVR_PAGE_SIZE,
        take: CVR_PAGE_SIZE,
        include: {
          lga: { select: { name: true } },
          town: { select: { name: true } },
          driver: { select: { fullName: true } },
        },
      }),
      db.cvrVehicle.count({ where }),
      db.cvrVehicle.count({ where: { status: "IDENTIFIED" } }),
      db.cvrVehicle.count({ where: { status: "REGISTERED" } }),
    ]);

    const vehicles: CvrVehicleRow[] = rows.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      chassisNumber: v.chassisNumber,
      category: v.category,
      make: v.make,
      model: v.model,
      color: v.color,
      status: v.status,
      vin: v.vin,
      stickerNumber: v.stickerNumber,
      operationType: v.operationType,
      lgaName: v.lga?.name ?? null,
      townName: v.town?.name ?? null,
      driverName: v.driver?.fullName ?? null,
      capturedByUserId: v.capturedByUserId,
      createdAt: v.createdAt,
    }));

    return {
      success: true,
      vehicles,
      stats: { total: await db.cvrVehicle.count(), identified, pendingVin },
      pagination: {
        page,
        pageSize: CVR_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / CVR_PAGE_SIZE)),
      },
    };
  } catch (err: unknown) {
    console.error("getCvrVehicles error:", err);
    return { success: false, error: "Failed to load vehicles." };
  }
}

export async function getCvrVehicle(vehicleId: string): Promise<
  | {
      success: true;
      vehicle: Awaited<ReturnType<typeof db.cvrVehicle.findUnique>> & object;
    }
  | { success: false; error: string }
> {
  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.cvrVehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: true,
        lga: true,
        town: true,
      },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };
    return { success: true, vehicle };
  } catch (err: unknown) {
    console.error("getCvrVehicle error:", err);
    return { success: false, error: "Failed to load vehicle." };
  }
}

export async function getCvrDrivers(opts: {
  page?: number;
  search?: string;
}): Promise<
  | {
      success: true;
      drivers: CvrDriverRow[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }
  | { success: false; error: string }
> {
  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  const page = Math.max(1, opts.page ?? 1);
  const search = opts.search?.trim() ?? "";

  try {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phoneNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      db.cvrDriver.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * CVR_PAGE_SIZE,
        take: CVR_PAGE_SIZE,
        include: { _count: { select: { vehicles: true } } },
      }),
      db.cvrDriver.count({ where }),
    ]);

    const drivers: CvrDriverRow[] = rows.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      gender: d.gender,
      state: d.state,
      city: d.city,
      passportPhotoUrl: d.passportPhotoUrl,
      vehicleCount: d._count.vehicles,
      capturedByUserId: d.capturedByUserId,
      createdAt: d.createdAt,
    }));

    return {
      success: true,
      drivers,
      pagination: {
        page,
        pageSize: CVR_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / CVR_PAGE_SIZE)),
      },
    };
  } catch (err: unknown) {
    console.error("getCvrDrivers error:", err);
    return { success: false, error: "Failed to load drivers." };
  }
}

export async function getCvrLgasAndTowns(): Promise<
  | {
      success: true;
      lgas: { id: string; name: string; state: string; towns: { id: string; name: string }[] }[];
    }
  | { success: false; error: string }
> {
  // This is a read-only reference data endpoint — allow any authenticated user.
  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const lgas = await db.cvrLga.findMany({
      orderBy: { name: "asc" },
      include: {
        towns: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    });
    return {
      success: true,
      lgas: lgas.map((l) => ({
        id: l.id,
        name: l.name,
        state: l.state,
        towns: l.towns,
      })),
    };
  } catch (err: unknown) {
    console.error("getCvrLgasAndTowns error:", err);
    return { success: false, error: "Failed to load LGAs and towns." };
  }
}

/** Available (unassigned) CVR drivers — for the assign-driver picker. */
export async function getAvailableCvrDrivers(search?: string): Promise<
  { success: true; drivers: { id: string; fullName: string; phoneNumber: string; passportPhotoUrl: string | null }[] }
  | { success: false; error: string }
> {
  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const where = search?.trim()
      ? {
          OR: [
            { fullName: { contains: search.trim(), mode: "insensitive" as const } },
            { phoneNumber: { contains: search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {};

    const drivers = await db.cvrDriver.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 50,
      select: { id: true, fullName: true, phoneNumber: true, passportPhotoUrl: true },
    });

    return { success: true, drivers };
  } catch (err: unknown) {
    console.error("getAvailableCvrDrivers error:", err);
    return { success: false, error: "Failed to load drivers." };
  }
}

/** CVR counts for the enumerator dashboard stats block. */
export async function getCvrStats(): Promise<{ vehicles: number; drivers: number }> {
  try {
    const [vehicles, drivers] = await Promise.all([
      db.cvrVehicle.count(),
      db.cvrDriver.count(),
    ]);
    return { vehicles, drivers };
  } catch {
    return { vehicles: 0, drivers: 0 };
  }
}
