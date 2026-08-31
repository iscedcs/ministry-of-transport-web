"use server";

/**
 * Executive Letter Approval Center — Server Actions
 *
 * Provides a consolidated, searchable queue of all regulatory approval letters,
 * permits, and certificates across Ministry operations for executive roles:
 * - Honourable Commissioner (final signatures & approvals)
 * - Permanent Secretary (operational review & recommendations)
 * - System Administrators & Ministry Admins (oversight)
 *
 * Modules covered:
 * 1. Motor Parks (Permits to Build / Operate, Final Approval Letters)
 * 2. Mass Transit (Company Operating Permits & Approval Letters)
 * 3. Terminals (New Terminal Approvals)
 * 4. Park Revalidations (Annual Revalidation Certificates)
 * 5. TRACAS (Letters of Authority)
 */

import { authorize } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_LIST_ROWS } from "@/lib/query-limits";
import type { ApplicationStatus } from "@prisma/client";

export type ExecutiveLetterModule =
  | "MOTOR_PARK"
  | "MASS_TRANSIT"
  | "TERMINAL"
  | "REVALIDATION"
  | "TRACAS";

export interface ExecutiveApprovalItem {
  id: string;
  module: ExecutiveLetterModule;
  title: string;
  subtitle: string;
  reference: string;
  applicantOrOwner: string;
  contactPhone?: string | null;
  lgaOrLocation?: string | null;
  status: string;
  stageLabel: string;
  submittedOrCreatedAt: Date;
  reviewUrl: string;
}

export interface ExecutiveLetterQueueData {
  items: ExecutiveApprovalItem[];
  counts: {
    totalPending: number;
    motorParks: number;
    massTransit: number;
    terminals: number;
    revalidations: number;
    tracas: number;
    awaitingCommissioner: number;
    awaitingPs: number;
  };
}

export async function getExecutiveLetterApprovalQueue(): Promise<
  | { success: true; data: ExecutiveLetterQueueData }
  | { success: false; error: string }
> {
  const authz = await authorize([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
    "ADMIN",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const role = authz.session.role;

    const parkStatusFilter: ApplicationStatus[] =
      role === "PERMANENT_SECRETARY"
        ? ["PENDING_PS_APPROVAL"]
        : role === "COMMISSIONER"
          ? ["PENDING_COMMISSIONER_APPROVAL", "PENDING_APPROVAL"]
          : [
              "PENDING_PS_APPROVAL",
              "PENDING_COMMISSIONER_APPROVAL",
              "PENDING_APPROVAL",
            ];

    const mtStatusFilter: ApplicationStatus[] =
      role === "PERMANENT_SECRETARY"
        ? ["PENDING_PS_APPROVAL"]
        : role === "COMMISSIONER"
          ? ["PENDING_COMMISSIONER_APPROVAL"]
          : ["PENDING_PS_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"];

    const terminalStatusFilter: ApplicationStatus[] =
      role === "PERMANENT_SECRETARY"
        ? ["PENDING_PS_APPROVAL"]
        : role === "COMMISSIONER"
          ? ["PENDING_COMMISSIONER_APPROVAL"]
          : ["PENDING_PS_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"];

    const revalStatusFilter: ApplicationStatus[] =
      role === "PERMANENT_SECRETARY"
        ? ["PENDING_PS_APPROVAL"]
        : role === "COMMISSIONER"
          ? ["PENDING_COMMISSIONER_APPROVAL"]
          : ["PENDING_PS_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"];

    const tracasStatusFilter =
      role === "COMMISSIONER"
        ? "PENDING_COMMISSIONER_APPROVAL"
        : undefined;

    const [parksRes, mtRes, termRes, revalRes, tracasRes] = await Promise.all([
      db.motorPark.findMany({
        where: { applicationStatus: { in: parkStatusFilter } },
        select: {
          id: true,
          businessName: true,
          parkId: true,
          anssidNumber: true,
          contactPerson: true,
          contactPhone: true,
          contactEmail: true,
          streetAddress: true,
          lga: true,
          townCity: true,
          applicationStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
      db.massTransitCompany.findMany({
        where: { applicationStatus: { in: mtStatusFilter } },
        select: {
          id: true,
          companyName: true,
          cacNumber: true,
          asinNumber: true,
          contactPerson: true,
          contactPhone: true,
          contactEmail: true,
          applicationStatus: true,
          currentFleetSize: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
      db.terminal.findMany({
        where: {
          motorParkId: null,
          addedAt: { not: null },
          applicationStatus: { in: terminalStatusFilter },
        },
        select: {
          id: true,
          companyId: true,
          managerName: true,
          managerPhone: true,
          locationAddress: true,
          terminalNumber: true,
          applicationStatus: true,
          createdAt: true,
          company: { select: { companyName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
      db.revalidationApplication.findMany({
        where: { status: { in: revalStatusFilter } },
        select: {
          id: true,
          parkName: true,
          ownerName: true,
          phoneNumber: true,
          emailAddress: true,
          revalidationNumber: true,
          asinNumber: true,
          townCommunity: true,
          lga: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
      db.tracasVehicle.findMany({
        where: tracasStatusFilter
          ? { letterStatus: tracasStatusFilter }
          : {
              letterStatus: {
                in: [
                  "PENDING_VIO_APPROVAL",
                  "PENDING_MD_APPROVAL",
                  "PENDING_COMMISSIONER_APPROVAL",
                ],
              },
            },
        select: {
          id: true,
          registrationNumber: true,
          fleetNumber: true,
          authorityRef: true,
          category: true,
          makeModel: true,
          assignedRoute: true,
          ownerName: true,
          letterStatus: true,
          createdAt: true,
          assignedDriver: { select: { fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_LIST_ROWS,
      }),
    ]);

    const items: ExecutiveApprovalItem[] = [
      ...parksRes.map((p) => ({
        id: p.id,
        module: "MOTOR_PARK" as const,
        title: p.businessName,
        subtitle: `${p.townCity ? `${p.townCity}, ` : ""}${p.lga || "Anambra State"} · Motor Park Approval`,
        reference:
          p.parkId || p.anssidNumber || `MP-${p.id.slice(-6).toUpperCase()}`,
        applicantOrOwner: `${p.contactPerson} (${p.contactPhone || p.contactEmail || ""})`,
        contactPhone: p.contactPhone,
        lgaOrLocation: `${p.streetAddress ? `${p.streetAddress}, ` : ""}${p.lga || ""}`,
        status: p.applicationStatus,
        stageLabel:
          p.applicationStatus === "PENDING_PS_APPROVAL"
            ? "Awaiting PS Recommendation"
            : "Awaiting Commissioner Approval",
        submittedOrCreatedAt: p.createdAt,
        reviewUrl: `/motor-parks/${p.id}/issue-final-approval`,
      })),
      ...mtRes.map((c) => ({
        id: c.id,
        module: "MASS_TRANSIT" as const,
        title: c.companyName,
        subtitle: `Mass Transit Operator · ${c.currentFleetSize ?? 0} Vehicles Registered`,
        reference:
          c.asinNumber || c.cacNumber || `MT-${c.id.slice(-6).toUpperCase()}`,
        applicantOrOwner: `${c.contactPerson || "Operator"} (${c.contactPhone || c.contactEmail || ""})`,
        contactPhone: c.contactPhone,
        lgaOrLocation: null,
        status: c.applicationStatus,
        stageLabel:
          c.applicationStatus === "PENDING_PS_APPROVAL"
            ? "Awaiting PS Clearance"
            : "Awaiting Commissioner Permit",
        submittedOrCreatedAt: c.createdAt,
        reviewUrl: `/fleet-operators/${c.id}/issue-permit`,
      })),
      ...termRes.map((t) => ({
        id: t.id,
        module: "TERMINAL" as const,
        title: `${t.company?.companyName ?? "Operator"} — Terminal #${t.terminalNumber}`,
        subtitle: `Terminal Approval · ${t.locationAddress}`,
        reference: `TERM-${t.id.slice(-6).toUpperCase()}`,
        applicantOrOwner: `Manager: ${t.managerName} (${t.managerPhone})`,
        contactPhone: t.managerPhone,
        lgaOrLocation: t.locationAddress,
        status: t.applicationStatus,
        stageLabel:
          t.applicationStatus === "PENDING_PS_APPROVAL"
            ? "Awaiting PS Clearance"
            : "Awaiting Commissioner Approval",
        submittedOrCreatedAt: t.createdAt,
        reviewUrl: `/fleet-operators/${t.companyId}/terminals/${t.id}`,
      })),
      ...revalRes.map((r) => ({
        id: r.id,
        module: "REVALIDATION" as const,
        title: r.parkName,
        subtitle: `Revalidation Certificate · ${r.townCommunity ? `${r.townCommunity}, ` : ""}${r.lga || "Anambra State"}`,
        reference:
          r.revalidationNumber ||
          r.asinNumber ||
          `REV-${r.id.slice(-6).toUpperCase()}`,
        applicantOrOwner: `${r.ownerName} (${r.phoneNumber || r.emailAddress || ""})`,
        contactPhone: r.phoneNumber,
        lgaOrLocation: `${r.townCommunity ? `${r.townCommunity}, ` : ""}${r.lga || ""}`,
        status: r.status,
        stageLabel:
          r.status === "PENDING_PS_APPROVAL"
            ? "Awaiting PS Recommendation"
            : "Awaiting Commissioner Certificate",
        submittedOrCreatedAt: r.createdAt,
        reviewUrl: `/admin/revalidation-queue/${r.id}/park-certificate`,
      })),
      ...tracasRes.map((v) => ({
        id: v.id,
        module: "TRACAS" as const,
        title: `${v.registrationNumber} (${v.fleetNumber})`,
        subtitle: `${v.makeModel ?? "Vehicle"} · ${v.category}${v.assignedRoute ? ` · Route: ${v.assignedRoute}` : ""}`,
        reference: v.authorityRef,
        applicantOrOwner: v.assignedDriver
          ? `Driver: ${v.assignedDriver.fullName} (${v.assignedDriver.phoneNumber})`
          : v.ownerName
            ? `Owner: ${v.ownerName}`
            : "No driver assigned",
        contactPhone: v.assignedDriver?.phoneNumber ?? null,
        lgaOrLocation: v.assignedRoute ?? null,
        status: v.letterStatus,
        stageLabel:
          v.letterStatus === "PENDING_VIO_APPROVAL"
            ? "Awaiting VIO Verification"
            : v.letterStatus === "PENDING_MD_APPROVAL"
              ? "Awaiting MD Signature"
              : v.letterStatus === "PENDING_COMMISSIONER_APPROVAL"
                ? "Awaiting Commissioner Signature"
                : "Pending",
        submittedOrCreatedAt: v.createdAt,
        reviewUrl: `/tracas/${v.id}/letter`,
      })),
    ];

    let awaitingCommissioner = 0;
    let awaitingPs = 0;

    for (const item of items) {
      if (
        item.status.includes("COMMISSIONER") ||
        item.status === "PENDING_APPROVAL"
      ) {
        awaitingCommissioner++;
      } else if (item.status.includes("PS")) {
        awaitingPs++;
      }
    }

    return {
      success: true,
      data: {
        items,
        counts: {
          totalPending: items.length,
          motorParks: parksRes.length,
          massTransit: mtRes.length,
          terminals: termRes.length,
          revalidations: revalRes.length,
          tracas: tracasRes.length,
          awaitingCommissioner,
          awaitingPs,
        },
      },
    };
  } catch (error: unknown) {
    console.error("getExecutiveLetterApprovalQueue failed:", error);
    return {
      success: false,
      error: "Failed to load executive letter approval queue.",
    };
  }
}
