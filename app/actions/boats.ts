"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface OnboardBoatInput {
  name: string;
  registrationNumber: string;
  boatType?: string;
  capacity?: number;
  engineNumber?: string;
  chassisNumber?: string;
  stickerId?: string;
  assignedRiderId?: string;
}

export interface OnboardRiderInput {
  fullName: string;
  phoneNumber: string;
  licenseNumber?: string;
}

// ─── Sticker Inventory Pool Actions ──────────────────────────────────────────

export async function addStickerUrlsToPool(inputUrls: string[]) {
  try {
    const urls = inputUrls
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      return { success: false, error: "No valid sticker URLs provided." };
    }

    let addedCount = 0;
    for (const url of urls) {
      const urlParts = url.split("/");
      const stickerCode = urlParts[urlParts.length - 1] || `STK-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.boatSticker.upsert({
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

    revalidatePath("/boats");
    return { success: true, count: addedCount };
  } catch (error: any) {
    console.error("Error adding stickers to pool:", error);
    return { success: false, error: error?.message || "Failed to add stickers to pool." };
  }
}

export async function getAvailableStickers() {
  try {
    const stickers = await db.boatSticker.findMany({
      where: { isAssigned: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: stickers };
  } catch (error: any) {
    console.error("Error fetching available stickers:", error);
    return { success: false, error: "Failed to fetch available stickers." };
  }
}

export async function getStickersList() {
  try {
    const stickers = await db.boatSticker.findMany({
      include: {
        assignedBoat: {
          select: { id: true, name: true, registrationNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: stickers };
  } catch (error: any) {
    console.error("Error fetching stickers list:", error);
    return { success: false, error: "Failed to fetch stickers list." };
  }
}

// ─── Helper: Unique Security Code Generator ──────────────────────────────────

async function generateUniqueSecurityCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `MOT-BOAT-${randomNum}`;
    const existing = await db.boat.findUnique({ where: { securityCode: code } });
    if (!existing) return code;
    attempts++;
  }
  return `MOT-BOAT-${Date.now().toString().slice(-4)}`;
}

// ─── Boat Onboarding & Fleet Actions ──────────────────────────────────────────

export async function onboardBoat(input: OnboardBoatInput) {
  try {
    if (!input.name || !input.registrationNumber) {
      return { success: false, error: "Boat name and registration number are required." };
    }

    const regUpper = input.registrationNumber.trim().toUpperCase();
    const existingReg = await db.boat.findUnique({ where: { registrationNumber: regUpper } });
    if (existingReg) {
      return { success: false, error: `A boat with registration number '${regUpper}' already exists.` };
    }

    const securityCode = await generateUniqueSecurityCode();

    const boat = await db.boat.create({
      data: {
        name: input.name.trim(),
        registrationNumber: regUpper,
        boatType: input.boatType || "SPEEDBOAT",
        capacity: input.capacity ? Number(input.capacity) : 10,
        engineNumber: input.engineNumber?.trim() || null,
        chassisNumber: input.chassisNumber?.trim() || null,
        securityCode: securityCode,
        assignedRiderId: input.assignedRiderId || null,
      },
    });

    if (input.stickerId) {
      await db.boatSticker.update({
        where: { id: input.stickerId },
        data: {
          isAssigned: true,
          assignedBoatId: boat.id,
          assignedAt: new Date(),
        },
      });
    }

    revalidatePath("/boats");
    return { success: true, data: boat };
  } catch (error: any) {
    console.error("Error onboarding boat:", error);
    return { success: false, error: error?.message || "Failed to onboard boat." };
  }
}
export async function assignStickerToBoat(boatId: string, stickerId: string) {
  try {
    // Unassign any currently assigned sticker on this boat
    await db.boatSticker.updateMany({
      where: { assignedBoatId: boatId },
      data: { isAssigned: false, assignedBoatId: null, assignedAt: null },
    });

    if (stickerId && stickerId !== "none") {
      await db.boatSticker.update({
        where: { id: stickerId },
        data: {
          isAssigned: true,
          assignedBoatId: boatId,
          assignedAt: new Date(),
        },
      });
    }

    revalidatePath("/boats");
    return { success: true };
  } catch (error: any) {
    console.error("Error assigning sticker to boat:", error);
    return { success: false, error: "Failed to assign sticker to boat." };
  }
}

export async function onboardRider(input: OnboardRiderInput) {
  try {
    if (!input.fullName || !input.phoneNumber) {
      return { success: false, error: "Full name and phone number are required." };
    }

    let licUpper: string | null = null;
    if (input.licenseNumber && input.licenseNumber.trim().length > 0) {
      licUpper = input.licenseNumber.trim().toUpperCase();
      const existingLic = await db.boatRider.findUnique({ where: { licenseNumber: licUpper } });
      if (existingLic) {
        return { success: false, error: `A rider with license number '${licUpper}' already exists.` };
      }
    }

    const rider = await db.boatRider.create({
      data: {
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        licenseNumber: licUpper,
        status: "ACTIVE",
      },
    });

    revalidatePath("/boats");
    return { success: true, data: rider };
  } catch (error: any) {
    console.error("Error onboarding rider:", error);
    return { success: false, error: error?.message || "Failed to onboard rider." };
  }
}

export async function reassignRider(boatId: string, riderId: string | null) {
  try {
    const boat = await db.boat.update({
      where: { id: boatId },
      data: {
        assignedRiderId: riderId || null,
      },
      include: { assignedRider: true },
    });

    revalidatePath("/boats");
    return { success: true, data: boat };
  } catch (error: any) {
    console.error("Error reassigning rider:", error);
    return { success: false, error: "Failed to reassign rider." };
  }
}

export async function getBoatsList(query?: string) {
  try {
    const search = query?.trim();

    const boats = await db.boat.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { registrationNumber: { contains: search, mode: "insensitive" } },
              { securityCode: { contains: search, mode: "insensitive" } },
              { assignedRider: { fullName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: {
        assignedRider: true,
        sticker: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: boats };
  } catch (error: any) {
    console.error("Error fetching boats list:", error);
    return { success: false, error: "Failed to fetch boats list." };
  }
}

export async function getBoatRidersList() {
  try {
    const riders = await db.boatRider.findMany({
      include: {
        boats: {
          select: { id: true, name: true, registrationNumber: true },
        },
      },
      orderBy: { fullName: "asc" },
    });
    return { success: true, data: riders };
  } catch (error: any) {
    console.error("Error fetching riders list:", error);
    return { success: false, error: "Failed to fetch boat riders." };
  }
}

// ─── Public Verification Action ───────────────────────────────────────────────

export async function getBoatPublicVerification(identifier: string) {
  try {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { success: false, error: "Identifier is required." };
    }

    let boat = await db.boat.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { securityCode: { equals: trimmed, mode: "insensitive" } },
          { registrationNumber: { equals: trimmed, mode: "insensitive" } },
          { sticker: { stickerUrl: { equals: trimmed, mode: "insensitive" } } },
          { sticker: { stickerCode: { equals: trimmed, mode: "insensitive" } } },
        ],
      },
      include: {
        assignedRider: true,
        sticker: true,
      },
    });

    if (!boat) {
      const sticker = await db.boatSticker.findFirst({
        where: {
          OR: [
            { stickerUrl: { contains: trimmed, mode: "insensitive" } },
            { stickerCode: { equals: trimmed, mode: "insensitive" } },
          ],
        },
        include: {
          assignedBoat: {
            include: {
              assignedRider: true,
              sticker: true,
            },
          },
        },
      });

      if (sticker?.assignedBoat) {
        boat = sticker.assignedBoat;
      }
    }

    if (!boat) {
      return { success: false, error: "Boat record not found." };
    }

    return { success: true, data: boat };
  } catch (error: any) {
    console.error("Error fetching public boat verification:", error);
    return { success: false, error: "Failed to fetch boat verification data." };
  }
}
