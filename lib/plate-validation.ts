/**
 * Platform-wide Plate Number Validation & Collision Detection
 * 
 * Enforces cross-module uniqueness across:
 * - CvrVehicle (Commercial Vehicle Registration)
 * - TracasVehicle (TRACAS Fleet)
 * - Vehicle (Mass Transit Operators)
 * - VehicleSubmission (Pending Mass Transit Submissions)
 */

import { db } from "@/lib/db";

export type VehicleModuleSource =
  | "Commercial Vehicle Registration (CVR)"
  | "TRACAS Fleet"
  | "Mass Transit Fleet"
  | "Mass Transit Submission";

export interface PlateExclusionOptions {
  cvrVehicleId?: string;
  tracasVehicleId?: string;
  massTransitVehicleId?: string;
}

export interface PlateCheckResult {
  isTaken: boolean;
  module?: VehicleModuleSource;
  matchedPlate?: string;
  vehicleId?: string;
  message?: string;
}

/**
 * Clean and normalize plate number string for storage & display.
 * e.g. "  awk - 123 - xa  " -> "AWK-123-XA"
 */
export function normalizePlateDisplay(plate: string): string {
  if (!plate) return "";
  return plate
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Strip all non-alphanumeric characters for strict collision detection.
 * e.g. "AWK-123-XA" -> "AWK123XA", "awk 123 xa" -> "AWK123XA"
 */
export function toAlphanumericPlate(plate: string): string {
  if (!plate) return "";
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Generate common formatting permutations of a plate number
 * to catch variants with or without dashes, spaces, or compact forms.
 */
export function getPlateSearchVariants(plate: string): string[] {
  if (!plate) return [];
  const raw = plate.trim();
  if (!raw) return [];

  const upper = raw.toUpperCase();
  const alphaNum = upper.replace(/[^A-Z0-9]/g, "");
  const withDashes = upper.replace(/[\s_]+/g, "-");
  const withSpaces = upper.replace(/[-_]+/g, " ");

  const variants = new Set<string>([raw, upper, alphaNum, withDashes, withSpaces]);

  // If plate resembles standard Nigerian format: 2-3 letters + 2-5 digits + 1-3 letters
  // e.g., "AWK123XA", "KJA456AB", "AN0123MOT"
  const standardMatch = alphaNum.match(/^([A-Z]{2,4})(\d{2,5})([A-Z]{1,3})$/);
  if (standardMatch) {
    const [, p1, p2, p3] = standardMatch;
    variants.add(`${p1}-${p2}-${p3}`);
    variants.add(`${p1} ${p2} ${p3}`);
    variants.add(`${p1}-${p2} ${p3}`);
    variants.add(`${p1} ${p2}-${p3}`);
  }

  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * Checks whether a plate number is already registered across any vehicle module.
 * Queries CvrVehicle, TracasVehicle, Vehicle, and VehicleSubmission with case-insensitive
 * matching across all formatting variants.
 */
export async function checkDuplicatePlateNumber(
  plate: string,
  exclude?: PlateExclusionOptions,
): Promise<PlateCheckResult> {
  const normalized = normalizePlateDisplay(plate);
  if (!normalized) {
    return { isTaken: false };
  }

  const variants = getPlateSearchVariants(normalized);
  if (variants.length === 0) {
    return { isTaken: false };
  }

  // Construct search clauses for each model
  const cvrWhere = {
    OR: variants.map((v) => ({ plateNumber: { equals: v, mode: "insensitive" as const } })),
    ...(exclude?.cvrVehicleId ? { id: { not: exclude.cvrVehicleId } } : {}),
  };

  const tracasWhere = {
    OR: variants.map((v) => ({
      registrationNumber: { equals: v, mode: "insensitive" as const },
    })),
    ...(exclude?.tracasVehicleId ? { id: { not: exclude.tracasVehicleId } } : {}),
  };

  const vehicleWhere = {
    OR: variants.map((v) => ({
      registrationNumber: { equals: v, mode: "insensitive" as const },
    })),
    ...(exclude?.massTransitVehicleId ? { id: { not: exclude.massTransitVehicleId } } : {}),
  };

  const submissionWhere = {
    OR: variants.map((v) => ({
      registrationNumber: { equals: v, mode: "insensitive" as const },
    })),
  };

  // Perform parallel checks across all 4 registries
  const [cvrMatch, tracasMatch, vehicleMatch, submissionMatch] = await Promise.all([
    db.cvrVehicle.findFirst({
      where: cvrWhere,
      select: { id: true, plateNumber: true },
    }),
    db.tracasVehicle.findFirst({
      where: tracasWhere,
      select: { id: true, registrationNumber: true, fleetNumber: true },
    }),
    db.vehicle.findFirst({
      where: vehicleWhere,
      select: { id: true, registrationNumber: true },
    }),
    db.vehicleSubmission.findFirst({
      where: submissionWhere,
      select: { id: true, registrationNumber: true },
    }),
  ]);

  if (cvrMatch) {
    return {
      isTaken: true,
      module: "Commercial Vehicle Registration (CVR)",
      matchedPlate: cvrMatch.plateNumber,
      vehicleId: cvrMatch.id,
      message: `Plate number "${cvrMatch.plateNumber}" is already registered under Commercial Vehicle Registration (CVR). Duplicate plate numbers are not permitted.`,
    };
  }

  if (tracasMatch) {
    return {
      isTaken: true,
      module: "TRACAS Fleet",
      matchedPlate: tracasMatch.registrationNumber,
      vehicleId: tracasMatch.id,
      message: `Plate number "${tracasMatch.registrationNumber}" is already registered under TRACAS Fleet${
        tracasMatch.fleetNumber ? ` (Fleet No: ${tracasMatch.fleetNumber})` : ""
      }. Duplicate plate numbers are not permitted.`,
    };
  }

  if (vehicleMatch) {
    return {
      isTaken: true,
      module: "Mass Transit Fleet",
      matchedPlate: vehicleMatch.registrationNumber,
      vehicleId: vehicleMatch.id,
      message: `Plate number "${vehicleMatch.registrationNumber}" is already registered under Mass Transit Fleet. Duplicate plate numbers are not permitted.`,
    };
  }

  if (submissionMatch) {
    return {
      isTaken: true,
      module: "Mass Transit Submission",
      matchedPlate: submissionMatch.registrationNumber,
      vehicleId: submissionMatch.id,
      message: `Plate number "${submissionMatch.registrationNumber}" is already recorded in an active Mass Transit vehicle submission. Duplicate plate numbers are not permitted.`,
    };
  }

  return { isTaken: false };
}
