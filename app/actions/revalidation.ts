"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { clearRevalidationDraft } from "./revalidation-draft";

export async function submitRevalidationApplication(_prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const app = await db.revalidationApplication.create({
      data: {
        applicantUserId: session.userId,
        ownerName: formData.get("ownerName") as string,
        ownershipType: formData.get("ownershipType") as string,
        cacRegistrationNumber: formData.get("cacRegistrationNumber") as string || null,
        representativeName: formData.get("representativeName") as string,
        designation: formData.get("designation") as string,
        phoneNumber: formData.get("phoneNumber") as string,
        alternatePhoneNumber: formData.get("alternatePhoneNumber") as string || null,
        emailAddress: formData.get("emailAddress") as string,
        residentialAddress: formData.get("residentialAddress") as string,
        asinNumber: formData.get("asinNumber") as string,
        nin: formData.get("nin") as string,
        tin: formData.get("tin") as string || null,
        parkName: formData.get("parkName") as string,
        facilityType: formData.get("facilityType") as string,
        facilitySubTypes: JSON.parse(formData.get("facilitySubTypes") as string || "[]"),
        physicalLocation: formData.get("physicalLocation") as string,
        townCommunity: formData.get("townCommunity") as string,
        lga: formData.get("lga") as string,
        yearEstablished: formData.get("yearEstablished") as string,
        operationalStatus: formData.get("operationalStatus") as string,
        dailyVehiclesCount: formData.get("dailyVehiclesCount") as string,
        vehicleTypes: formData.get("vehicleTypes") as string,
        facilitiesAvailable: JSON.parse(formData.get("facilitiesAvailable") as string || "{}"),
        existingApprovalNum: formData.get("existingApprovalNum") as string || null,
        maintainsManifest: formData.get("maintainsManifest") === "true",
        operatorsRegistered: formData.get("operatorsRegistered") === "true",
        paymentsUpToDate: formData.get("paymentsUpToDate") === "true",
        safetySignages: formData.get("safetySignages") === "true",
        pendingSanctions: formData.get("pendingSanctions") === "true",
        sanctionDetails: formData.get("sanctionDetails") as string || null,
        managementStaffCount: parseInt(formData.get("managementStaffCount") as string || "0", 10),
        adminStaffCount: parseInt(formData.get("adminStaffCount") as string || "0", 10),
        securityStaffCount: parseInt(formData.get("securityStaffCount") as string || "0", 10),
        otherStaffCount: parseInt(formData.get("otherStaffCount") as string || "0", 10),
        otherStaffDetails: formData.get("otherStaffDetails") as string || null,
        securityArrangement: formData.get("securityArrangement") as string,
        estimatedDailyRevenue: parseInt(formData.get("estimatedDailyRevenue") as string || "0", 10) * 100,
        estimatedMonthlyRev: parseInt(formData.get("estimatedMonthlyRev") as string || "0", 10) * 100,
        revenueCollectionMethod: formData.get("revenueCollectionMethod") as string,
        passportPhotoId: formData.get("passportPhotoId") as string || null,
        passportPhotoUrl: formData.get("passportPhotoUrl") as string || null,
      }
    });

    await clearRevalidationDraft();

    return { success: true, data: { applicationId: app.id } };
  } catch (error: any) {
    console.error("Failed to submit revalidation:", error);
    
    let errorMessage = "Failed to submit application. Please check your inputs.";
    if (error?.code === 'P2002') {
      errorMessage = "An application with this ASIN Number already exists.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}
