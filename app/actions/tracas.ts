"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface OnboardTracasVehicleInput {
  registrationNumber: string;
  fleetNumber: string;
  category?: string;
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
    const urls = inputUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    if (urls.length === 0) {
      return { success: false, error: "No valid sticker URLs provided." };
    }

    let addedCount = 0;
    for (const url of urls) {
      const urlParts = url.split("/");
      const stickerCode = urlParts[urlParts.length - 1] || `TRAC-STK-${Math.floor(1000 + Math.random() * 9000)}`;

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
      orderBy: { createdAt: "desc" },
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
      include: {
        assignedVehicle: {
          select: { id: true, registrationNumber: true, fleetNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: stickers };
  } catch (error: any) {
    console.error("Error fetching TRACAS sticker list:", error);
    return { success: false, error: "Failed to fetch sticker list." };
  }
}

// ─── Authority Ref Code Generator ─────────────────────────────────────────

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
    if (!input.registrationNumber?.trim()) {
      return { success: false, error: "Registration Number is required." };
    }
    if (!input.fleetNumber?.trim()) {
      return { success: false, error: "Fleet Number is required." };
    }

    const regNo = input.registrationNumber.trim();
    const fleetNo = input.fleetNumber.trim();

    const existingReg = await db.tracasVehicle.findUnique({ where: { registrationNumber: regNo } });
    if (existingReg) {
      return { success: false, error: `Vehicle with registration '${regNo}' already exists.` };
    }

    const existingFleet = await db.tracasVehicle.findUnique({ where: { fleetNumber: fleetNo } });
    if (existingFleet) {
      return { success: false, error: `Vehicle with fleet number '${fleetNo}' already exists.` };
    }

    const authorityRef = input.authorityRef?.trim() || (await generateUniqueAuthorityRef());

    const ownershipType = input.ownershipType || "GOVERNMENT_OWNED";
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
        makeModel: input.makeModel || null,
        engineNumber: input.engineNumber || null,
        chassisNumber: input.chassisNumber || null,
        insuranceCertificateNo: input.insuranceCertificateNo || null,
        insuranceCommencement: input.insuranceCommencement ? new Date(input.insuranceCommencement) : null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        particularsIssueDate: input.particularsIssueDate ? new Date(input.particularsIssueDate) : null,
        particularsExpiryDate: input.particularsExpiryDate ? new Date(input.particularsExpiryDate) : null,
        assignedRoute: input.assignedRoute || null,
        ownershipType: ownershipType,
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

    revalidatePath("/tracas");
    return { success: true, data: vehicle };
  } catch (error: any) {
    console.error("Error onboarding TRACAS vehicle:", error);
    return { success: false, error: error?.message || "Failed to onboard vehicle." };
  }
}

export async function assignStickerToTracasVehicle(vehicleId: string, stickerId: string | null) {
  try {
    const existingVehicleSticker = await db.tracasSticker.findUnique({ where: { assignedVehicleId: vehicleId } });
    if (existingVehicleSticker) {
      await db.tracasSticker.update({
        where: { id: existingVehicleSticker.id },
        data: { isAssigned: false, assignedVehicleId: null, assignedAt: null },
      });
    }

    if (stickerId) {
      await db.tracasSticker.update({
        where: { id: stickerId },
        data: { isAssigned: true, assignedVehicleId: vehicleId, assignedAt: new Date() },
      });
    }

    revalidatePath("/tracas");
    return { success: true };
  } catch (error: any) {
    console.error("Error assigning sticker to vehicle:", error);
    return { success: false, error: error?.message || "Failed to assign sticker." };
  }
}

export async function reassignTracasDriver(vehicleId: string, driverId: string | null) {
  try {
    const updated = await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: { assignedDriverId: driverId },
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
    if (!input.fullName?.trim()) {
      return { success: false, error: "Full Name is required." };
    }
    if (!input.phoneNumber?.trim()) {
      return { success: false, error: "Phone Number is required." };
    }

    if (input.licenseNumber?.trim()) {
      const existingLic = await db.tracasDriver.findUnique({
        where: { licenseNumber: input.licenseNumber.trim() },
      });
      if (existingLic) {
        return { success: false, error: `Driver with license '${input.licenseNumber.trim()}' already exists.` };
      }
    }

    const driver = await db.tracasDriver.create({
      data: {
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber.trim(),
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

    revalidatePath("/tracas");
    return { success: true, data: driver };
  } catch (error: any) {
    console.error("Error onboarding TRACAS driver:", error);
    return { success: false, error: error?.message || "Failed to onboard driver." };
  }
}

// ─── Fetch Fleet & Authority Letter Data ─────────────────────────────────

export async function getTracasFleetData() {
  try {
    const vehicles = await db.tracasVehicle.findMany({
      include: {
        assignedDriver: true,
        sticker: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const drivers = await db.tracasDriver.findMany({
      include: {
        vehicles: {
          select: { id: true, registrationNumber: true, fleetNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stickers = await db.tracasSticker.findMany({
      include: {
        assignedVehicle: {
          select: { id: true, registrationNumber: true, fleetNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, vehicles, drivers, stickers };
  } catch (error: any) {
    console.error("Error fetching TRACAS fleet data:", error);
    return { success: false, error: "Failed to load TRACAS data." };
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
