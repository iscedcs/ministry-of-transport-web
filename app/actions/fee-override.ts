"use server";

/**
 * Commissioner-only fee correction, for records already approved and sitting
 * in the ICT Printing Centre.
 *
 * An operator is sometimes issued a monthly fee that turns out to be wrong —
 * too high, a mistyped figure — and until now there was no way to correct it
 * once the approval had gone through; the only options were to leave it wrong
 * or re-run the whole approval chain. This is a narrow escape hatch: the
 * Commissioner alone (not even System Admin or the Permanent Secretary) can
 * overwrite the figure directly. It is a correction, not a reassessment — the
 * previous amount is not recorded and no "reviewed from X to Y" wording is
 * triggered on the letter. The letter and certificate already read the fee
 * live off these tables, so reprinting afterwards picks up the new figure
 * with no further change needed.
 *
 * TRACAS is explicitly out of scope — this never touches TracasVehicle or any
 * TRACAS fee.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/** Only the Commissioner. Not System Admin, not the Permanent Secretary. */
const FEE_OVERRIDE_ROLES = ["COMMISSIONER"] as const;

function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Mass transit company fee. Cascades to every terminal that has already
 * become a park — the company letter and each terminal's own record are one
 * approval, and must agree.
 */
export async function overrideMassTransitFee(
  companyId: string,
  newMonthlyFeeNaira: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize([...FEE_OVERRIDE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!newMonthlyFeeNaira || newMonthlyFeeNaira <= 0) {
    return { success: false, error: "Enter a fee amount greater than zero." };
  }

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      companyName: true,
      applicationStatus: true,
      terminals: { select: { motorParkId: true } },
    },
  });
  if (!company) return { success: false, error: "Company not found." };
  if (!["APPROVED", "TEMPORAL_APPROVAL"].includes(company.applicationStatus)) {
    return { success: false, error: "Only an approved company's fee can be corrected here." };
  }

  const kobo = toKobo(newMonthlyFeeNaira);
  const parkIds = company.terminals.map((t) => t.motorParkId).filter((id): id is string => !!id);

  await db.$transaction([
    db.massTransitCompany.update({
      where: { id: companyId },
      data: { monthlyLevyAmount: kobo },
    }),
    ...(parkIds.length > 0
      ? [
          db.motorPark.updateMany({
            where: { id: { in: parkIds } },
            data: { monthlyLevyAmount: kobo },
          }),
        ]
      : []),
  ]);

  await recordAudit({
    action: "FEE_OVERRIDE_MASS_TRANSIT",
    entityType: "MASS_TRANSIT",
    entityId: companyId,
    changeDescription: `Commissioner corrected the monthly fee for ${company.companyName} to ₦${newMonthlyFeeNaira.toLocaleString()}, applied to ${parkIds.length} terminal(s)`,
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath(`/fleet-operators/${companyId}/approval-letter`);
  revalidatePath("/ict-printing");
  return { success: true };
}

/** A single motor park's own fee — standalone park or one terminal on its own. */
export async function overrideMotorParkFee(
  parkId: string,
  newMonthlyFeeNaira: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize([...FEE_OVERRIDE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!newMonthlyFeeNaira || newMonthlyFeeNaira <= 0) {
    return { success: false, error: "Enter a fee amount greater than zero." };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { businessName: true, applicationStatus: true },
  });
  if (!park) return { success: false, error: "Park not found." };
  if (!["APPROVED", "TEMPORAL_APPROVAL"].includes(park.applicationStatus)) {
    return { success: false, error: "Only an approved park's fee can be corrected here." };
  }

  await db.motorPark.update({
    where: { id: parkId },
    data: { monthlyLevyAmount: toKobo(newMonthlyFeeNaira) },
  });

  await recordAudit({
    action: "FEE_OVERRIDE_MOTOR_PARK",
    entityType: "MOTOR_PARK",
    entityId: parkId,
    changeDescription: `Commissioner corrected the monthly fee for ${park.businessName} to ₦${newMonthlyFeeNaira.toLocaleString()}`,
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath(`/motor-parks/${parkId}/approval-letter`);
  revalidatePath("/ict-printing");
  return { success: true };
}

/**
 * A revalidation's fee. Cascades to its own park (if it produced one) and,
 * when this revalidation is how a mass transit operator was approved, to
 * that company and all its terminals too — one approval, one figure.
 */
export async function overrideRevalidationFee(
  applicationId: string,
  newMonthlyFeeNaira: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize([...FEE_OVERRIDE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!newMonthlyFeeNaira || newMonthlyFeeNaira <= 0) {
    return { success: false, error: "Enter a fee amount greater than zero." };
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: {
      parkName: true,
      status: true,
      motorParkId: true,
      massTransitCompanyId: true,
    },
  });
  if (!app) return { success: false, error: "Revalidation not found." };
  if (app.status !== "APPROVED") {
    return { success: false, error: "Only an approved revalidation's fee can be corrected here." };
  }

  const kobo = toKobo(newMonthlyFeeNaira);
  const writes = [
    db.revalidationApplication.update({
      where: { id: applicationId },
      data: { monthlyFeeAmount: kobo },
    }),
  ];

  if (app.motorParkId) {
    writes.push(
      db.motorPark.update({
        where: { id: app.motorParkId },
        data: { monthlyLevyAmount: kobo },
      }) as never,
    );
  }

  let terminalParkIds: string[] = [];
  if (app.massTransitCompanyId) {
    const company = await db.massTransitCompany.findUnique({
      where: { id: app.massTransitCompanyId },
      select: { terminals: { select: { motorParkId: true } } },
    });
    terminalParkIds = (company?.terminals ?? [])
      .map((t) => t.motorParkId)
      .filter((id): id is string => !!id);

    writes.push(
      db.massTransitCompany.update({
        where: { id: app.massTransitCompanyId },
        data: { monthlyLevyAmount: kobo },
      }) as never,
    );
    if (terminalParkIds.length > 0) {
      writes.push(
        db.motorPark.updateMany({
          where: { id: { in: terminalParkIds } },
          data: { monthlyLevyAmount: kobo },
        }) as never,
      );
    }
  }

  await db.$transaction(writes);

  await recordAudit({
    action: "FEE_OVERRIDE_REVALIDATION",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Commissioner corrected the monthly fee for ${app.parkName} to ₦${newMonthlyFeeNaira.toLocaleString()}`,
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue/${applicationId}/certificate`);
  if (app.massTransitCompanyId) revalidatePath(`/fleet-operators/${app.massTransitCompanyId}`);
  revalidatePath("/ict-printing");
  return { success: true };
}
