"use server";

import { db } from "@/lib/db";
import { checkStoredUrl } from "@/lib/media-url";
import { getSession } from "@/lib/auth";
import { clearRevalidationDraft } from "./revalidation-draft";

/**
 * The record a revalidation is carried over from.
 *
 * Called with no argument it falls back to the operator's most recent park,
 * which is what the free-form "New revalidation" route uses. Called with an
 * asset chosen from the due list it loads exactly that one — picking the
 * newest park would otherwise pre-fill the wrong record for an operator who
 * holds several.
 */
export async function getExistingParkForRevalidation(asset?: {
  kind: "MOTOR_PARK" | "MASS_TRANSIT";
  id: string;
}) {
  try {
    const session = await getSession();
    if (!session) return null;

    if (asset?.kind === "MASS_TRANSIT") {
      const company = await db.massTransitCompany.findFirst({
        where: { id: asset.id, contactUserId: session.userId },
        include: { terminals: { orderBy: { terminalNumber: "asc" }, take: 1 } },
      });
      if (!company) return null;

      const terminal = company.terminals[0];
      return {
        id: company.id,
        parkName: company.companyName,
        ownerName: company.contactPerson || company.companyName,
        ownershipType: "Registered Company",
        representativeName: company.contactPerson ?? "",
        designation: null,
        alternatePhoneNumber: null,
        nin: null,
        tin: null,
        phoneNumber: company.contactPhone ?? "",
        emailAddress: company.contactEmail ?? "",
        residentialAddress: terminal?.managerResidentialAddress ?? "",
        asinNumber: company.asinNumber ?? "",
        physicalLocation: terminal?.locationAddress ?? "",
        townCommunity: "",
        lga: "",
        existingApprovalNum: company.permitNumber || company.asinNumber || "",
        cacRegistrationNumber: company.cacNumber || "",
        monthlyLevyAmount: company.monthlyLevyAmount,
      };
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    // An explicitly chosen park wins; otherwise fall back to the most recent.
    const park = asset?.id
      ? await db.motorPark.findFirst({
          where: { id: asset.id, contactUserId: session.userId },
        })
      : await db.motorPark.findFirst({
      where: {
        OR: [
          { contactUserId: session.userId },
          ...(user?.email ? [{ contactEmail: { equals: user.email, mode: "insensitive" as const } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!park) return null;

    // Section A was captured in full the last time this operator revalidated.
    // A park record does not hold a designation, an NIN or a TIN, so without
    // this the applicant retypes details the Ministry already has.
    const previous = await db.revalidationApplication.findFirst({
      where: {
        OR: [
          { motorParkId: park.id },
          ...(park.anssidNumber
            ? [{ asinNumber: park.anssidNumber, applicantUserId: session.userId }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        ownershipType: true,
        representativeName: true,
        designation: true,
        alternatePhoneNumber: true,
        nin: true,
        tin: true,
        residentialAddress: true,
        facilityType: true,
      },
    });

    return {
      id: park.id,
      ownershipType: previous?.ownershipType ?? null,
      representativeName: previous?.representativeName ?? park.contactPerson,
      designation: previous?.designation ?? null,
      alternatePhoneNumber: previous?.alternatePhoneNumber ?? null,
      nin: previous?.nin ?? null,
      tin: previous?.tin ?? null,
      parkName: park.businessName,
      ownerName: park.contactPerson || park.transportCompanyName,
      phoneNumber: park.contactPhone,
      emailAddress: park.contactEmail,
      residentialAddress: park.managerResidentialAddress || "",
      asinNumber: park.anssidNumber,
      physicalLocation: park.streetAddress,
      townCommunity: park.townCity,
      lga: park.lga,
      existingApprovalNum: park.permitNumber || park.anssidNumber,
      cacRegistrationNumber: park.cacRegistrationNumber || "",
      monthlyLevyAmount: park.monthlyLevyAmount,
    };
  } catch (error) {
    console.error("Failed to fetch existing park for revalidation:", error);
    return null;
  }
}

export async function submitRevalidationApplication(_prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const asinNumber = formData.get("asinNumber") as string;
    const existingApprovalNum = formData.get("existingApprovalNum") as string;

    // Photographs belong in object storage; the column holds a URL only.
    const photoProblem = checkStoredUrl(
      formData.get("passportPhotoUrl") as string,
      "Passport photograph",
    );
    if (photoProblem) return { success: false, error: photoProblem };
    let motorParkId = (formData.get("motorParkId") as string) || null;

    // Auto-detect existing MotorPark if not explicitly passed
    if (!motorParkId && (asinNumber || existingApprovalNum)) {
      const existingPark = await db.motorPark.findFirst({
        where: {
          OR: [
            { contactUserId: session.userId },
            ...(asinNumber ? [{ anssidNumber: { equals: asinNumber, mode: "insensitive" as const } }] : []),
            ...(existingApprovalNum ? [{ permitNumber: { equals: existingApprovalNum, mode: "insensitive" as const } }] : []),
            ...(existingApprovalNum ? [{ anssidNumber: { equals: existingApprovalNum, mode: "insensitive" as const } }] : []),
          ],
        },
      });
      if (existingPark) {
        motorParkId = existingPark.id;
      }
    }

    const app = await db.revalidationApplication.create({
      data: {
        applicantUserId: session.userId,
        motorParkId,
        ownerName: formData.get("ownerName") as string,
        ownershipType: formData.get("ownershipType") as string,
        cacRegistrationNumber: (formData.get("cacRegistrationNumber") as string) || null,
        representativeName: formData.get("representativeName") as string,
        designation: formData.get("designation") as string,
        phoneNumber: formData.get("phoneNumber") as string,
        alternatePhoneNumber: (formData.get("alternatePhoneNumber") as string) || null,
        emailAddress: formData.get("emailAddress") as string,
        residentialAddress: formData.get("residentialAddress") as string,
        asinNumber,
        nin: formData.get("nin") as string,
        tin: (formData.get("tin") as string) || null,
        parkName: formData.get("parkName") as string,
        facilityType: formData.get("facilityType") as string,
        facilitySubTypes: JSON.parse((formData.get("facilitySubTypes") as string) || "[]"),
        physicalLocation: formData.get("physicalLocation") as string,
        townCommunity: formData.get("townCommunity") as string,
        lga: formData.get("lga") as string,
        yearEstablished: formData.get("yearEstablished") as string,
        operationalStatus: formData.get("operationalStatus") as string,
        dailyVehiclesCount: formData.get("dailyVehiclesCount") as string,
        vehicleTypes: formData.get("vehicleTypes") as string,
        facilitiesAvailable: JSON.parse((formData.get("facilitiesAvailable") as string) || "{}"),
        existingApprovalNum: existingApprovalNum || null,
        maintainsManifest: formData.get("maintainsManifest") === "true",
        operatorsRegistered: formData.get("operatorsRegistered") === "true",
        paymentsUpToDate: formData.get("paymentsUpToDate") === "true",
        safetySignages: formData.get("safetySignages") === "true",
        pendingSanctions: formData.get("pendingSanctions") === "true",
        sanctionDetails: (formData.get("sanctionDetails") as string) || null,
        managementStaffCount: parseInt((formData.get("managementStaffCount") as string) || "0", 10),
        adminStaffCount: parseInt((formData.get("adminStaffCount") as string) || "0", 10),
        securityStaffCount: parseInt((formData.get("securityStaffCount") as string) || "0", 10),
        otherStaffCount: parseInt((formData.get("otherStaffCount") as string) || "0", 10),
        otherStaffDetails: (formData.get("otherStaffDetails") as string) || null,
        securityArrangement: formData.get("securityArrangement") as string,
        estimatedDailyRevenue: parseInt((formData.get("estimatedDailyRevenue") as string) || "0", 10) * 100,
        estimatedMonthlyRev: parseInt((formData.get("estimatedMonthlyRev") as string) || "0", 10) * 100,
        revenueCollectionMethod: formData.get("revenueCollectionMethod") as string,
        passportPhotoId: (formData.get("passportPhotoId") as string) || null,
        passportPhotoUrl: (formData.get("passportPhotoUrl") as string) || null,
      },
    });

    await clearRevalidationDraft();

    return { success: true, data: { applicationId: app.id } };
  } catch (error: any) {
    console.error("Failed to submit revalidation:", error);

    let errorMessage = "Failed to submit application. Please check your inputs.";
    if (error?.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}
