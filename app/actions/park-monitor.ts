"use server";

import { db } from "@/lib/db";
import { checkStoredUrl } from "@/lib/media-url";
import { isOwnStorageUrl } from "@/lib/spaces";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  nin: string;
  residentialAddress: string;
  phoneNumber: string;
  emailAddress: string;
  maritalStatus: string;
  currentOccupation?: string;
  employer?: string;
  positionHeld?: string;
  height?: string;
  weight?: string;
  isMedicallyFit: boolean;
  hasCriminalConviction: boolean;
  agreesToSecurityCheck: boolean;
  reasonForJoining: string;
  referees: unknown;
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

export async function submitParkMonitorApplication(
  input: ParkMonitorApplicationInput,
): Promise<ParkMonitorApplicationResult> {
  try {
    // Public submission - no session required

    const photoProblem = photoUrlProblem(input.idCardPhotoUrl);
    if (photoProblem) return { success: false, error: photoProblem };

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
        nin: input.nin,
        residentialAddress: input.residentialAddress,
        phoneNumber: input.phoneNumber,
        emailAddress: input.emailAddress,
        maritalStatus: input.maritalStatus,
        currentOccupation: input.currentOccupation || null,
        employer: input.employer || null,
        positionHeld: input.positionHeld || null,
        height: input.height || null,
        weight: input.weight || null,
        isMedicallyFit: input.isMedicallyFit,
        hasCriminalConviction: input.hasCriminalConviction,
        agreesToSecurityCheck: input.agreesToSecurityCheck,
        reasonForJoining: input.reasonForJoining,
        referees: input.referees as never,
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

export async function reviewParkMonitorApplication(
  id: string,
  status: "APPROVED" | "REJECTED" | "WAITLISTED",
  notes: string,
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "COMMISSIONER") {
      return {
        success: false,
        error: "Unauthorized. Only Commissioner can review.",
      };
    }

    const app = await db.parkMonitorApplication.findUnique({ where: { id } });
    if (!app) {
      return { success: false, error: "Application not found." };
    }

    const updateData: any = {
      status,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
    };

    if (status === "REJECTED") {
      updateData.rejectionReason = notes;
    } else if (status === "WAITLISTED") {
      updateData.waitlistReason = notes;
    }

    await db.$transaction(async (tx) => {
      // Create user if approved and they don't have one
      if (status === "APPROVED" && !app.userId) {
        // Check if user already exists by email
        let user = await tx.user.findUnique({
          where: { email: app.emailAddress },
        });

        // Also check by phone if not found by email
        if (!user && app.phoneNumber) {
          user = await tx.user.findFirst({
            where: { phone: app.phoneNumber },
          });
        }

        if (user) {
          // If user exists, just update their role
          // And set a password if they don't have one (because they were an external applicant)
          const updatePayload: any = {
            role: "PARK_MONITOR",
          };

          if (!user.passwordHash) {
            const bcrypt = (await import("bcryptjs")).default;
            updatePayload.passwordHash = await bcrypt.hash("Password0123", 12);
          }

          user = await tx.user.update({
            where: { id: user.id },
            data: updatePayload,
          });
        } else {
          // Create new user
          const bcrypt = (await import("bcryptjs")).default;
          const passwordHash = await bcrypt.hash("Password0123", 12);

          user = await tx.user.create({
            data: {
              firstName: app.firstName,
              lastName: app.surname,
              email: app.emailAddress,
              phone: app.phoneNumber,
              asinNumber: app.nin, // fallback to nin
              role: "PARK_MONITOR",
              passwordHash,
            },
          });
        }

        updateData.userId = user.id;
      }

      await tx.parkMonitorApplication.update({
        where: { id },
        data: updateData,
      });
    });

    revalidatePath("/admin/park-monitors");
    revalidatePath("/dashboard");

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
 * Staff add or replace an applicant's photograph — for example when the
 * onboarding officer did not capture one, or it came out unusable. Any status
 * except a rejected application; the photo only matters once an ID is issued.
 */
export async function setParkMonitorPhotoByStaff(
  applicationId: string,
  photoUrl: string | null,
) {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "HOD_PARKS" && session.role !== "SYSTEM_ADMIN")
    ) {
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

export async function updateParkMonitorPhoto(photoUrl: string) {
  try {
    const photoProblem = photoUrlProblem(photoUrl);
    if (photoProblem) return { success: false, error: photoProblem };

    const session = await getSession();
    if (
      !session ||
      (session.role !== "EXTERNAL_APPLICANT" && session.role !== "PARK_MONITOR")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const app = await db.parkMonitorApplication.findUnique({
      where: { userId: session.userId },
    });

    if (!app || app.status !== "APPROVED") {
      return { success: false, error: "Application is not approved yet" };
    }

    await db.parkMonitorApplication.update({
      where: { id: app.id },
      data: { idCardPhotoUrl: photoUrl },
    });

    return { success: true };
  } catch (error) {
    console.error("[UpdateParkMonitorPhoto Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update photo",
    };
  }
}

export async function issueParkMonitorId(applicationId: string) {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "HOD_PARKS" && session.role !== "SYSTEM_ADMIN")
    ) {
      return { success: false, error: "Unauthorized. Only HOD can issue ID." };
    }

    const app = await db.parkMonitorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!app || app.status !== "APPROVED") {
      return { success: false, error: "Application is not approved." };
    }

    if (app.idCardIssued) {
      return { success: false, error: "ID Card already issued." };
    }

    // The card is printed with this photograph; an ID without one is useless.
    if (!app.idCardPhotoUrl) {
      return {
        success: false,
        error: "Upload the applicant's passport photograph before issuing the ID.",
      };
    }

    // Generate unique URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const idUrl = `${baseUrl}/verify/park-monitor/${app.id}`;

    // In a real implementation, we would generate a QR code image and upload it to Spaces.
    // For now, we store the URL and generate the QR code on the fly in the UI, or use a public API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(idUrl)}`;

    await db.$transaction(async (tx) => {
      await tx.parkMonitorApplication.update({
        where: { id: applicationId },
        data: {
          idCardIssued: true,
          idCardIssuedAt: new Date(),
          idCardIssuedByUserId: session.userId,
          idCardUrl: idUrl,
          qrCodeUrl: qrCodeUrl,
        },
      });

      if (app.userId) {
        // Update the applicant's role to PARK_MONITOR
        await tx.user.update({
          where: { id: app.userId },
          data: {
            role: "PARK_MONITOR",
          },
        });
      }
    });

    revalidatePath(`/admin/park-monitors/${applicationId}`);
    revalidatePath("/admin/park-monitors");

    return { success: true };
  } catch (error) {
    console.error("[IssueParkMonitorId Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to issue ID",
    };
  }
}
