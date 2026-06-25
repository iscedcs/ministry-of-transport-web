"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function onboardParkStaff(data: {
  motorParkId: string;
  name: string;
  role: string;
  photoUrl: string;
}) {
  try {
    const park = await db.motorPark.findUnique({
      where: { id: data.motorParkId },
      select: { id: true, businessName: true, applicationStatus: true },
    });

    if (!park || park.applicationStatus !== "APPROVED") {
      return { success: false, error: "Only approved motor parks can onboard staff." };
    }

    // Determine next serial number
    const maxSerial = await db.parkStaff.aggregate({
      where: { motorParkId: park.id },
      _max: { parkSerialNumber: true },
    });
    
    const nextSerial = (maxSerial._max.parkSerialNumber || 0) + 1;
    const formattedSerial = nextSerial.toString().padStart(4, '0');
    
    // Create security code
    const safeParkName = park.businessName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 15);
    const securityCode = `MOT-${safeParkName}-${formattedSerial}`;

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
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/park-staff/${staff.id}`;
    
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
