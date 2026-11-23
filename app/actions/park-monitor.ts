"use server";

import { db } from "@/lib/db";
import { checkStoredUrl } from "@/lib/media-url";
import { isOwnStorageUrl } from "@/lib/spaces";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isEnforcementApprover } from "@/lib/enforcement-roles";
import {
  buildEnforcementCode,
  enforcementCodePrefix,
  serialOf,
  suggestedOperationLga,
} from "@/lib/enforcement-code";
import { isAnambraLga } from "@/lib/lga-code";
import {
  DEFAULT_ENFORCEMENT_TYPE,
  isEnforcementType,
} from "@/lib/enforcement-type";

export type ParkMonitorApplicationResult =
  | { success: true; applicationId: string }
  | { success: false; error: string };

/**
 * Exactly what an applicant may set. This action is public, so it must not
 * accept a whole Prisma create payload — that would let any caller submit
 * `status: "APPROVED"` or `idCardIssued: true` for themselves.
 */
export interface ParkMonitorApplicationInput {
  surname: string;
  firstName: string;
  otherNames?: string;
  gender: string;
  age: number;
  stateOfOrigin: string;
  lga: string;
  communityTown: string;
  /** Local Government of Operation the applicant asks for; the HOD assigns the final one. */
  preferredOperationLga: string;
  nin: string;
  residentialAddress: string;
  phoneNumber: string;
  /** Optional — an applicant may not have an email address. */
  emailAddress?: string;
  maritalStatus: string;
  currentOccupation?: string;
  employer?: string;
  positionHeld?: string;
  height?: string;
  weight?: string;
  isMedicallyFit: boolean;
  hasCriminalConviction: boolean;
  agreesToSecurityCheck: boolean;
  /** Enforcement unit; defaults to the Special Enforcement Unit. */
  enforcementType?: string;
  /** Optional. Blank rows are dropped; a started row needs a name and phone. */
  referees?: unknown;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  nextOfKinAddress: string;
  /** Passport photograph, already uploaded to object storage. */
  idCardPhotoUrl?: string | null;
}

/** A photograph URL must be a stored URL on our own storage, never an embedded image or a foreign host. */
function photoUrlProblem(url: string | null | undefined): string | null {
  if (!url) return null;
  const embedded = checkStoredUrl(url, "Passport photograph");
  if (embedded) return embedded;
  if (!isOwnStorageUrl(url)) {
    return "The passport photograph must be uploaded through the form.";
  }
  return null;
}


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Referee {
  name: string;
  phone: string;
  relation: string;
  email: string;
  address: string;
}

/**
 * References are optional. Rows left completely blank are dropped; a row the
 * applicant started must at least have a name and a phone number so it is
 * something the Ministry can actually follow up.
 */
function cleanReferees(
  raw: unknown,
): { ok: true; value: Referee[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "Invalid referees." };
  if (raw.length > 5) return { ok: false, error: "Too many referees." };

  const out: Referee[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = (raw[i] ?? {}) as Record<string, unknown>;
    const str = (k: string) =>
      typeof r[k] === "string" ? (r[k] as string).trim() : "";
    const row: Referee = {
      name: str("name"),
      phone: str("phone"),
      relation: str("relation"),
      email: str("email"),
      address: str("address"),
    };
    if (!row.name && !row.phone && !row.relation && !row.email && !row.address) {
      continue; // untouched row
    }
    if (!row.name || !row.phone) {
      return {
        ok: false,
        error: `Referee ${i + 1}: enter both a name and a phone number, or clear that referee.`,
      };
    }
    if (row.email && !EMAIL_RE.test(row.email)) {
      return { ok: false, error: `Referee ${i + 1}: the email address is not valid.` };
    }
    out.push(row);
  }
  return { ok: true, value: out };
}

export async function submitParkMonitorApplication(
  input: ParkMonitorApplicationInput,
): Promise<ParkMonitorApplicationResult> {
  try {
    // Public submission - no session required

    const photoProblem = photoUrlProblem(input.idCardPhotoUrl);
    if (photoProblem) return { success: false, error: photoProblem };

    const email = input.emailAddress?.trim() || null;
    if (email && !EMAIL_RE.test(email)) {
      return { success: false, error: "The email address is not valid." };
    }

    const refs = cleanReferees(input.referees);
    if (!refs.ok) return { success: false, error: refs.error };

    if (!isAnambraLga(input.preferredOperationLga)) {
      return {
        success: false,
        error: "Choose the Local Government of Operation from the list.",
      };
    }

    // Only a known unit is accepted; anything else falls back to the default.
    const enforcementType = isEnforcementType(input.enforcementType)
      ? input.enforcementType
      : DEFAULT_ENFORCEMENT_TYPE;

    // Check if user already applied with this NIN to prevent duplicates
    const existing = await db.parkMonitorApplication.findUnique({
      where: { nin: input.nin },
    });

    if (existing) {
      return {
        success: false,
        error: "An application with this NIN already exists.",
      };
    }

    const application = await db.parkMonitorApplication.create({
      data: {
        surname: input.surname,
        firstName: input.firstName,
        otherNames: input.otherNames || null,
        gender: input.gender,
        age: input.age,
        stateOfOrigin: input.stateOfOrigin,
        lga: input.lga,
        communityTown: input.communityTown,
        preferredOperationLga: input.preferredOperationLga,
        nin: input.nin,
        residentialAddress: input.residentialAddress,
        phoneNumber: input.phoneNumber,
        emailAddress: email,
        maritalStatus: input.maritalStatus,
        currentOccupation: input.currentOccupation || null,
        employer: input.employer || null,
        positionHeld: input.positionHeld || null,
        height: input.height || null,
        weight: input.weight || null,
        isMedicallyFit: input.isMedicallyFit,
        hasCriminalConviction: input.hasCriminalConviction,
        agreesToSecurityCheck: input.agreesToSecurityCheck,
        referees: refs.value as never,
        enforcementType,
        nextOfKinName: input.nextOfKinName,
        nextOfKinPhone: input.nextOfKinPhone,
        nextOfKinRelationship: input.nextOfKinRelationship,
        nextOfKinAddress: input.nextOfKinAddress,
        idCardPhotoUrl: input.idCardPhotoUrl || null,
        // status defaults to SUBMITTED; never taken from the caller.
      },
    });

    return { success: true, applicationId: application.id };
  } catch (error) {
    console.error("[SubmitParkMonitorApplication Error]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit application",
    };
  }
}

/**
 * The ID card is generated the moment an application is approved: it is simply
 * "issued" — the card page renders from the stored data and the QR code points
 * at the public verification page. There is no fee and no claim step.
 */
function idCardIssueFields(applicationId: string, issuerUserId: string) {
  const idUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/park-monitor/${applicationId}`;
  return {
    idCardIssued: true,
    idCardIssuedAt: new Date(),
    idCardIssuedByUserId: issuerUserId,
    idCardUrl: idUrl,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(idUrl)}`,
  };
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * The next ID number for this member's town, e.g. MOT/Awk/SEU./007. Read inside
 * the issuing transaction; the unique index on idCode is the real guard, and
 * withCodeRetry() re-runs the transaction if two approvals race for a number.
 */
async function nextIdCode(tx: Tx, lga: string): Promise<string> {
  const prefix = enforcementCodePrefix(lga);
  const taken = await tx.parkMonitorApplication.findMany({
    where: { idCode: { startsWith: prefix } },
    select: { idCode: true },
  });
  const highest = taken.reduce(
    (max, r) => Math.max(max, serialOf(r.idCode ?? "", prefix)),
    0,
  );
  return buildEnforcementCode(lga, highest + 1);
}

/** Re-run `work` when it loses a race for an ID number (unique violation). */
async function withCodeRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt >= 5) throw error;
    }
  }
}

const NO_PHOTO_ERROR =
  "Add the applicant's passport photograph first — the ID card is printed with it.";

function revalidateEnforcement(applicationId: string) {
  revalidatePath(`/admin/park-monitors/${applicationId}`);
  revalidatePath("/admin/park-monitors");
  revalidatePath("/admin/park-monitors/groups");
  revalidatePath("/dashboard");
}

/**
 * Approve, reject or waitlist an application. Approving also issues the ID
 * card in the same step. Approvers: HOD Parks, HOD Parks Revalidation, System
 * Admin, Commissioner (lib/enforcement-roles.ts).
 */
export async function reviewParkMonitorApplication(
  id: string,
  status: "APPROVED" | "REJECTED" | "WAITLISTED",
  notes: string,
  /** Required when approving: the Local Government of Operation the HOD assigns. */
  operationLga?: string,
) {
  try {
    const session = await getSession();
    if (!session || !isEnforcementApprover(session.role)) {
      return {
        success: false,
        error:
          "Unauthorized. Only an HOD, the System Admin or the Commissioner can review.",
      };
    }

    const app = await db.parkMonitorApplication.findUnique({ where: { id } });
    if (!app) {
      return { success: false, error: "Application not found." };
    }
    if (app.idCardIssued) {
      return {
        success: false,
        error: "This application is already approved and its ID card issued.",
      };
    }
    if (status === "APPROVED" && app.status === "APPROVED") {
      // Legacy: approved under the old flow but never issued — use issue.
      return { success: false, error: "This application is already approved." };
    }

    const data: Record<string, unknown> = {
      status,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
    };

    let assignedLga = "";
    if (status === "APPROVED") {
      if (!app.idCardPhotoUrl) return { success: false, error: NO_PHOTO_ERROR };
      // The HOD's choice is final and overrides what the applicant asked for.
      if (!isAnambraLga(operationLga)) {
        return {
          success: false,
          error: "Choose the Local Government of Operation before approving.",
        };
      }
      assignedLga = operationLga;
      data.operationLga = assignedLga;
      Object.assign(data, idCardIssueFields(id, session.userId), {
        rejectionReason: null,
        waitlistReason: null,
      });
    } else if (status === "REJECTED") {
      data.rejectionReason = notes;
    } else if (status === "WAITLISTED") {
      data.waitlistReason = notes;
    }

    await withCodeRetry(() =>
      db.$transaction(async (tx) => {
        if (status === "APPROVED") {
          data.idCode = await nextIdCode(tx, assignedLga);
        }
        await tx.parkMonitorApplication.update({ where: { id }, data });
        // Applicants from the old flow may already have an account; keep its role.
        if (status === "APPROVED" && app.userId) {
          await tx.user.update({
            where: { id: app.userId },
            data: { role: "PARK_MONITOR" },
          });
        }
      }),
    );

    revalidateEnforcement(id);
    return { success: true };
  } catch (error) {
    console.error("[ReviewParkMonitorApplication Error]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to review application",
    };
  }
}

/**
 * Add or replace an applicant's photograph — for example when the onboarding
 * officer did not capture one, or it came out unusable. Any status except a
 * rejected application, and only until the ID card is issued.
 */
export async function setParkMonitorPhotoByStaff(
  applicationId: string,
  photoUrl: string | null,
) {
  try {
    const session = await getSession();
    if (!session || !isEnforcementApprover(session.role)) {
      return { success: false, error: "Unauthorized." };
    }

    const photoProblem = photoUrlProblem(photoUrl);
    if (photoProblem) return { success: false, error: photoProblem };

    const app = await db.parkMonitorApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true, idCardIssued: true },
    });
    if (!app) return { success: false, error: "Application not found." };
    if (app.status === "REJECTED") {
      return { success: false, error: "This application was rejected." };
    }
    if (app.idCardIssued) {
      return {
        success: false,
        error: "The ID card has already been issued; its photograph can no longer change.",
      };
    }

    await db.parkMonitorApplication.update({
      where: { id: applicationId },
      data: { idCardPhotoUrl: photoUrl || null },
    });

    revalidatePath(`/admin/park-monitors/${applicationId}`);
    return { success: true };
  } catch (error) {
    console.error("[SetParkMonitorPhotoByStaff Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save photo",
    };
  }
}

/**
 * Issue the ID card for an application that was approved under the old flow
 * (approved, fee/claim pending) and so has no card yet. New approvals issue
 * the card themselves.
 */
export async function issueParkMonitorId(
  applicationId: string,
  operationLga?: string,
) {
  try {
    const session = await getSession();
    if (!session || !isEnforcementApprover(session.role)) {
      return { success: false, error: "Unauthorized." };
    }

    const app = await db.parkMonitorApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app || app.status !== "APPROVED") {
      return { success: false, error: "Application is not approved." };
    }
    if (app.idCardIssued) {
      return { success: false, error: "ID Card already issued." };
    }
    if (!app.idCardPhotoUrl) return { success: false, error: NO_PHOTO_ERROR };

    // The HOD's choice wins; otherwise one already assigned, else what the
    // applicant asked for. It must be a real LGA — the ID number is built from it.
    const lga = operationLga || app.operationLga || suggestedOperationLga(app);
    if (!isAnambraLga(lga)) {
      return {
        success: false,
        error: "Choose the Local Government of Operation first.",
      };
    }

    await withCodeRetry(() =>
      db.$transaction(async (tx) => {
        await tx.parkMonitorApplication.update({
          where: { id: applicationId },
          data: {
            ...idCardIssueFields(applicationId, session.userId),
            operationLga: lga,
            // Keep a code already assigned; otherwise take the next one.
            idCode: app.idCode ?? (await nextIdCode(tx, lga)),
          },
        });
        if (app.userId) {
          await tx.user.update({
            where: { id: app.userId },
            data: { role: "PARK_MONITOR" },
          });
        }
      }),
    );

    revalidateEnforcement(applicationId);
    return { success: true };
  } catch (error) {
    console.error("[IssueParkMonitorId Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to issue ID",
    };
  }
}
