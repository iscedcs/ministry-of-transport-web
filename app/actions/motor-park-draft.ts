"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface DraftData {
  businessName: string;
  transportCompanyName: string;
  cacRegistrationNumber: string;
  anssidNumber: string;
  locationAddress: string;
  gpsCoordinates: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  cacDocumentId: string;
  cacDocumentUrl: string;
  cacDocumentName: string;
}

export interface DraftState {
  stepReached: number;
  data: DraftData;
}

export async function loadParkDraft(): Promise<DraftState | null> {
  const session = await requireAuth();
  const draft = await db.motorParkDraft.findUnique({
    where: { userId: session.userId },
    select: { stepReached: true, data: true },
  });
  if (!draft) return null;
  return {
    stepReached: draft.stepReached,
    data: draft.data as unknown as DraftData,
  };
}

export async function saveParkDraft(
  stepReached: number,
  data: DraftData,
): Promise<void> {
  const session = await requireAuth();
  await db.motorParkDraft.upsert({
    where: { userId: session.userId },
    update: { stepReached, data: data as object },
    create: {
      userId: session.userId,
      stepReached,
      data: data as object,
    },
  });
}

export async function clearParkDraft(): Promise<void> {
  const session = await requireAuth();
  await db.motorParkDraft.deleteMany({
    where: { userId: session.userId },
  });
}
