"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type RevalidationDraftData = {
  ownerName: string;
  ownershipType: string;
  cacRegistrationNumber: string;
  representativeName: string;
  designation: string;
  phoneNumber: string;
  alternatePhoneNumber: string;
  emailAddress: string;
  residentialAddress: string;
  asinNumber: string;
  nin: string;
  tin: string;
  parkName: string;
  facilityType: string;
  facilitySubTypes: string[];
  physicalLocation: string;
  townCommunity: string;
  lga: string;
  yearEstablished: string;
  operationalStatus: string;
  dailyVehiclesCount: string;
  vehicleTypes: string[];
  vehicleTypesOther: string;
  facilitiesAvailable: Record<string, boolean>;
  existingApprovalNum: string;
  maintainsManifest: boolean;
  operatorsRegistered: boolean;
  paymentsUpToDate: boolean;
  safetySignages: boolean;
  pendingSanctions: boolean;
  sanctionDetails: string;
  managementStaffCount: string;
  adminStaffCount: string;
  securityStaffCount: string;
  otherStaffCount: string;
  otherStaffDetails: string;
  securityArrangement: string;
  estimatedDailyRevenue: string;
  estimatedMonthlyRev: string;
  revenueCollectionMethod: string;
  passportPhotoId: string;
  passportPhotoUrl: string;
  passportPhotoName: string;
};

export async function loadRevalidationDraft() {
  const session = await getSession();
  if (!session) return null;

  const draft = await db.revalidationDraft.findUnique({
    where: { userId: session.userId },
  });

  if (!draft) return null;

  return {
    stepReached: draft.stepReached,
    data: draft.data as unknown as RevalidationDraftData,
  };
}

export async function saveRevalidationDraft(step: number, data: Partial<RevalidationDraftData>) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await db.revalidationDraft.upsert({
    where: { userId: session.userId },
    update: { stepReached: step, data: data as any },
    create: { userId: session.userId, stepReached: step, data: data as any },
  });
}

export async function clearRevalidationDraft() {
  const session = await getSession();
  if (!session) return;
  await db.revalidationDraft.deleteMany({
    where: { userId: session.userId },
  });
}
