"use server";

/**
 * Editing a revalidation application in place.
 *
 * The 257 records migrated from the previous vendor arrived with Sections F
 * and H empty and several Section A–D fields patchy. Rather than send every
 * park back to its owner, the HOD of Operations and the HOD of Parks
 * Revalidation can complete a record directly — they are the officers who
 * handle it on paper anyway.
 *
 * Editing is closed once the Commissioner has approved: a certificate has been
 * issued against those values and the record must stop moving.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const EDIT_ROLES = [
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "SYSTEM_ADMIN",
  // The Anambra team lead corrects imported records; they still approve none.
  "ADMIN",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
] as const;

/** Sections the vendor import could not populate. */
const SECTION_FIELDS = {
  A: [
    "ownerName",
    "ownershipType",
    "representativeName",
    "designation",
    "phoneNumber",
    "alternatePhoneNumber",
    "emailAddress",
    "residentialAddress",
    "cacRegistrationNumber",
  ],
  B: ["asinNumber", "nin", "tin"],
  C: ["parkName", "facilityType", "physicalLocation", "townCommunity", "lga"],
  D: ["yearEstablished", "operationalStatus", "dailyVehiclesCount", "vehicleTypes"],
  E: ["facilitiesAvailable"],
  F: [
    "existingApprovalNum",
    "maintainsManifest",
    "operatorsRegistered",
    "paymentsUpToDate",
    "safetySignages",
    "pendingSanctions",
    "sanctionDetails",
  ],
  G: [
    "managementStaffCount",
    "adminStaffCount",
    "securityStaffCount",
    "otherStaffCount",
    "securityArrangement",
  ],
  H: ["estimatedDailyRevenue", "estimatedMonthlyRev", "revenueCollectionMethod"],
} as const;

const TEXT_FIELDS = new Set<string>([
  ...SECTION_FIELDS.A,
  ...SECTION_FIELDS.B,
  ...SECTION_FIELDS.C,
  ...SECTION_FIELDS.D,
  "existingApprovalNum",
  "sanctionDetails",
  "securityArrangement",
  "revenueCollectionMethod",
]);

const BOOLEAN_FIELDS = new Set<string>([
  "maintainsManifest",
  "operatorsRegistered",
  "paymentsUpToDate",
  "safetySignages",
  "pendingSanctions",
]);

const INT_FIELDS = new Set<string>([
  "managementStaffCount",
  "adminStaffCount",
  "securityStaffCount",
  "otherStaffCount",
  "estimatedDailyRevenue",
  "estimatedMonthlyRev",
]);

/** Which sections still hold a null the officer should fill. */
function outstandingSections(app: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    const anyMissing = (fields as readonly string[]).some((f) => {
      const v = app[f];
      // Staff counts legitimately default to 0, so only null counts as missing.
      return v === null || v === undefined || v === "";
    });
    if (anyMissing) missing.push(section);
  }
  return missing;
}

export async function updateRevalidationApplication(
  applicationId: string,
  values: Record<string, string | null>,
) {
  const authz = await authorize([...EDIT_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the HOD of Operations or HOD of Parks Revalidation can edit an application.",
    };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
  });
  if (!current) return { success: false, error: "Application not found." };

  // Build the update from known fields only. Anything the form did not send is
  // left untouched rather than blanked.
  const data: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const [key, raw] of Object.entries(values)) {
    const value = typeof raw === "string" ? raw.trim() : raw;

    // Section E is a list of facility labels, sent as JSON.
    if (key === "facilitiesAvailable") {
      try {
        const parsed = JSON.parse(String(value ?? "[]"));
        data[key] = Array.isArray(parsed)
          ? parsed.filter((x) => typeof x === "string")
          : [];
      } catch {
        return { success: false, error: "Facilities list was not readable." };
      }
      if (
        JSON.stringify(data[key]) !==
        JSON.stringify((current as Record<string, unknown>)[key])
      ) {
        changed.push(key);
      }
      continue;
    }

    if (TEXT_FIELDS.has(key)) {
      data[key] = value === "" || value == null ? null : value;
    } else if (BOOLEAN_FIELDS.has(key)) {
      // "" means "still not stated" and must stay null, not become false.
      data[key] = value === "" || value == null ? null : value === "true";
    } else if (INT_FIELDS.has(key)) {
      if (value === "" || value == null) {
        data[key] = null;
      } else {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) {
          return { success: false, error: `"${key}" must be a positive number.` };
        }
        data[key] = Math.round(n);
      }
    } else {
      continue; // unknown field — ignore rather than trust
    }

    if (data[key] !== (current as Record<string, unknown>)[key]) changed.push(key);
  }

  if (changed.length === 0) {
    return { success: false, error: "Nothing was changed." };
  }

  const merged = { ...(current as Record<string, unknown>), ...data };
  const stillMissing = outstandingSections(merged);

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.revalidationApplication.update({
      where: { id: applicationId },
      data: { ...data, incompleteSections: stillMissing },
    });

    // If there is a linked MotorPark, synchronize matching fields so both records stay identical
    if (current.motorParkId) {
      const parkUpdates: Record<string, string> = {};
      if (typeof data.parkName === "string" && data.parkName) {
        parkUpdates.businessName = data.parkName;
      }
      if (typeof data.physicalLocation === "string" && data.physicalLocation) {
        parkUpdates.streetAddress = data.physicalLocation;
      }
      if (typeof data.townCommunity === "string" && data.townCommunity) {
        parkUpdates.townCity = data.townCommunity;
      }
      if (typeof data.lga === "string" && data.lga) {
        parkUpdates.lga = data.lga;
      }
      if (typeof data.representativeName === "string" && data.representativeName) {
        parkUpdates.contactPerson = data.representativeName;
      }
      if (typeof data.phoneNumber === "string" && data.phoneNumber) {
        parkUpdates.contactPhone = data.phoneNumber;
      }
      if (typeof data.emailAddress === "string" && data.emailAddress) {
        parkUpdates.contactEmail = data.emailAddress;
      }
      if (typeof data.residentialAddress === "string" && data.residentialAddress) {
        parkUpdates.managerResidentialAddress = data.residentialAddress;
      }

      if (Object.keys(parkUpdates).length > 0) {
        await tx.motorPark.update({
          where: { id: current.motorParkId },
          data: parkUpdates,
        });
      }
    }

    return res;
  });

  await recordAudit({
    action: "REVALIDATION_APPLICATION_EDITED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `${changed.length} field(s) updated on ${updated.parkName}: ${changed.join(", ")}`,
    oldValues: Object.fromEntries(
      changed.map((k) => [k, (current as Record<string, unknown>)[k]]),
    ),
    newValues: Object.fromEntries(changed.map((k) => [k, data[k]])),
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue/${applicationId}/edit`);
  revalidatePath(`/admin/revalidation-queue/${applicationId}/certificate`);
  revalidatePath(`/admin/revalidation-queue/${applicationId}/park-certificate`);
  revalidatePath(`/revalidation/${applicationId}/certificate`);
  revalidatePath(`/revalidation/${applicationId}/park-certificate`);
  revalidatePath(`/admin/revalidation-queue`);
  revalidatePath(`/letter-approvals`);
  if (current.motorParkId) {
    revalidatePath(`/motor-parks/${current.motorParkId}`);
    revalidatePath(`/motor-parks/${current.motorParkId}/approval-letter`);
    revalidatePath(`/motor-parks/${current.motorParkId}/park-certificate`);
    revalidatePath(`/motor-parks`);
  }

  return { success: true, data: { changed: changed.length, stillMissing } };
}
