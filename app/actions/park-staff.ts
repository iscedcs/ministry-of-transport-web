"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth";
import { checkStoredUrl } from "@/lib/media-url";
import { buildStaffSecurityCode } from "@/lib/staff-code";

export async function onboardParkStaff(data: {
  motorParkId: string;
  name: string;
  role: string;
  photoUrl: string;
}) {
  try {
    // This action previously had no authorization whatsoever — any signed-in
    // user could add staff to any park.
    const authz = await authorize([
      "ENUMERATOR",
      "HOD_PARKS",
      "HOD_TRANSPORT_OPS",
      "SYSTEM_ADMIN",
      "ADMIN",
      "EXTERNAL_APPLICANT",
    ]);
    if (!authz.ok) return { success: false, error: authz.error };

    const photoProblem = checkStoredUrl(data.photoUrl, "Staff photograph");
    if (photoProblem) return { success: false, error: photoProblem };

    const park = await db.motorPark.findUnique({
      where: { id: data.motorParkId },
      select: {
        id: true,
        businessName: true,
        townCity: true,
        applicationStatus: true,
      },
    });

    if (!park || (park.applicationStatus !== "APPROVED" && park.applicationStatus !== "TEMPORAL_APPROVAL")) {
      return { success: false, error: "Only approved or temporally approved motor parks can onboard staff." };
    }

    // Determine next serial number
    const maxSerial = await db.parkStaff.aggregate({
      where: { motorParkId: park.id },
      _max: { parkSerialNumber: true },
    });
    
    const nextSerial = (maxSerial._max.parkSerialNumber || 0) + 1;

    // MOT/Awk/Isc./001 — the format printed on the reflective vest, so the
    // code an officer reads aloud matches the one worn. See lib/staff-code.ts.
    const securityCode = buildStaffSecurityCode(
      park.businessName,
      park.townCity,
      nextSerial,
    );

    const staff = await db.parkStaff.create({
      data: {
        motorParkId: park.id,
        parkSerialNumber: nextSerial,
        securityCode,
        name: data.name,
        role: data.role,
        photoUrl: data.photoUrl,
        profileUrl: "", // Will update after getting ID
      },
    });

    // Update with actual profile URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8150";
    const profileUrl = `${baseUrl}/verify/park-staff/${staff.id}`;
    
    // Simple QR generation using an external service for now (or standard lib)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;

    await db.parkStaff.update({
      where: { id: staff.id },
      data: { profileUrl, qrCodeUrl },
    });

    revalidatePath(`/motor-parks/${park.id}/staff`);
    return { success: true, data: staff.id };
  } catch (error: any) {
    console.error("Staff Onboarding Error:", error);
    return { success: false, error: "Failed to onboard staff" };
  }
}

export async function deleteParkStaff(staffId: string, parkId: string) {
  try {
    await db.parkStaff.delete({
      where: { id: staffId }
    });
    revalidatePath(`/motor-parks/${parkId}/staff`);
    return { success: true };
  } catch (error) {
    console.error("Delete Staff Error:", error);
    return { success: false, error: "Failed to delete staff member" };
  }
}
