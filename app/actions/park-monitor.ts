"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ParkMonitorApplicationResult =
  | { success: true; applicationId: string }
  | { success: false; error: string };

export async function submitParkMonitorApplication(
  data: Omit<Parameters<typeof db.parkMonitorApplication.create>[0]["data"], "userId">
): Promise<ParkMonitorApplicationResult> {
  try {
    // Public submission - no session required
    
    // Check if user already applied with this NIN to prevent duplicates
    const existing = await db.parkMonitorApplication.findUnique({
      where: { nin: data.nin },
    });

    if (existing) {
      return { success: false, error: "An application with this NIN already exists." };
    }

    const application = await db.parkMonitorApplication.create({
      data: {
        ...data,
      },
    });

    return { success: true, applicationId: application.id };
  } catch (error) {
    console.error("[SubmitParkMonitorApplication Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit application",
    };
  }
}

export async function reviewParkMonitorApplication(
  id: string,
  status: "APPROVED" | "REJECTED" | "WAITLISTED",
  notes: string
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "COMMISSIONER") {
      return { success: false, error: "Unauthorized. Only Commissioner can review." };
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
          where: { email: app.emailAddress }
        });

        // Also check by phone if not found by email
        if (!user && app.phoneNumber) {
          user = await tx.user.findFirst({
            where: { phone: app.phoneNumber }
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
            data: updatePayload
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
      error: error instanceof Error ? error.message : "Failed to review application",
    };
  }
}

export async function updateParkMonitorPhoto(photoUrl: string) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "EXTERNAL_APPLICANT" && session.role !== "PARK_MONITOR")) {
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
    if (!session || (session.role !== "HOD_PARKS" && session.role !== "SYSTEM_ADMIN")) {
      return { success: false, error: "Unauthorized. Only HOD can issue ID." };
    }

    const app = await db.parkMonitorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!app || app.status !== "APPROVED") {
      return { success: false, error: "Application is not approved." };
    }
    
    if (app.idCardIssued) {
      return { success: false, error: "ID Card already issued." };
    }

    // Generate unique URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
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
