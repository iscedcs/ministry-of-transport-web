"use server";

/**
 * Adding a terminal to a company that is already approved.
 *
 * A mass transit operator does not stop growing once their permit is issued.
 * Originally every terminal had to be declared on the first application, and
 * anything opened afterwards had nowhere to go.
 *
 * A terminal added now is its own small application. It is inspected, then
 * passes the HOD, the Permanent Secretary and the Commissioner exactly as a
 * first application does, and only then becomes a motor park with its own
 * letter of authority — numbered under the parent company, so the paperwork
 * still reads as one operator with several sites.
 *
 * Terminals declared on the original application are untouched by any of
 * this: they inherit the company's outcome, as they always have.
 */

import { db } from "@/lib/db";
import { authorize, requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { nextParkId, terminalDesignation } from "@/lib/park-id";
import { getNumberSetting } from "@/lib/system-config";
import { revalidatePath } from "next/cache";

/** The company must already hold an approval for a terminal to be added. */
const APPROVED_COMPANY = ["APPROVED", "TEMPORAL_APPROVAL"];

/** Who may add a terminal: the operator themselves, or a field Enumerator. */
const ADD_ROLES = [
  "EXTERNAL_APPLICANT",
  "ENUMERATOR",
  "HOD_TRANSPORT_OPS",
  "SYSTEM_ADMIN",
  "ADMIN",
] as const;

export interface AddTerminalInput {
  locationAddress: string;
  gpsCoordinates?: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  managerResidentialAddress: string;
  /** Certificate number and the uploaded document — both are required. */
  businessPremisesCertNo: string;
  businessPremisesCertDocId: string;

  /**
   * What the site has, and the photographs of it. Optional, exactly as on a
   * first application: the terminal is inspected before it becomes a park, and
   * the inspection settles what is actually there.
   */
  facilitiesAvailable?: Record<string, boolean>;
  toiletPhotoId?: string;
  waitingAreaPhotoId?: string;
  signagePhotoId?: string;
  waterFacilityPhotoId?: string;
  cctvPhotoId?: string;
}

// ── Adding ──────────────────────────────────────────────────────────────────

export async function addTerminalToCompany(
  companyId: string,
  input: AddTerminalInput,
) {
  const authz = await authorize([...ADD_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      companyName: true,
      contactUserId: true,
      applicationStatus: true,
      terminals: { select: { terminalNumber: true } },
    },
  });
  if (!company) return { success: false, error: "Fleet operator not found." };

  // An applicant may only add to their own company; staff may add to any.
  if (
    authz.session.role === "EXTERNAL_APPLICANT" &&
    company.contactUserId !== authz.session.userId
  ) {
    return { success: false, error: "This is not your company." };
  }

  if (!APPROVED_COMPANY.includes(company.applicationStatus)) {
    return {
      success: false,
      error:
        "Terminals are added to an approved operator. This application has not been approved yet — declare the terminal on the application itself.",
    };
  }

  const required: [keyof AddTerminalInput, string][] = [
    ["locationAddress", "the terminal address"],
    ["managerName", "the terminal manager's name"],
    ["managerPhone", "the manager's phone number"],
    ["managerEmail", "the manager's email"],
    ["managerResidentialAddress", "the manager's residential address"],
    // Each site is certificated separately, so this cannot be inherited from
    // the company's own certificate.
    ["businessPremisesCertNo", "the business premises certificate number"],
    ["businessPremisesCertDocId", "the business premises certificate document"],
  ];
  const missing = required
    .filter(([k]) => !String(input[k] ?? "").trim())
    .map(([, label]) => label);
  if (missing.length > 0) {
    return { success: false, error: `Still required: ${missing.join("; ")}` };
  }

  // Terminal numbers drive the certificate wording, so they only ever go up.
  const nextNumber =
    company.terminals.reduce((max, t) => Math.max(max, t.terminalNumber), 0) + 1;

  const terminal = await db.terminal.create({
    data: {
      companyId,
      locationAddress: input.locationAddress.trim(),
      gpsCoordinates: input.gpsCoordinates?.trim() || null,
      managerName: input.managerName.trim(),
      managerPhone: input.managerPhone.trim(),
      managerEmail: input.managerEmail.trim(),
      managerResidentialAddress: input.managerResidentialAddress.trim(),
      businessPremisesCertNo: input.businessPremisesCertNo.trim(),
      businessPremisesCertDocId: input.businessPremisesCertDocId,
      facilitiesAvailable: input.facilitiesAvailable ?? undefined,
      toiletPhotoId: input.toiletPhotoId || null,
      waitingAreaPhotoId: input.waitingAreaPhotoId || null,
      signagePhotoId: input.signagePhotoId || null,
      waterFacilityPhotoId: input.waterFacilityPhotoId || null,
      cctvPhotoId: input.cctvPhotoId || null,
      terminalNumber: nextNumber,
      applicationStatus: "SUBMITTED",
      addedByUserId: authz.session.userId,
      addedAt: new Date(),
    },
    select: { id: true, terminalNumber: true },
  });

  await recordAudit({
    action: "TERMINAL_ADDED",
    entityType: "MASS_TRANSIT",
    entityId: companyId,
    changeDescription: `Terminal ${terminal.terminalNumber} added to ${company.companyName} and submitted for approval`,
    newValues: { terminalId: terminal.id, applicationStatus: "SUBMITTED" },
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true, data: { terminalId: terminal.id } };
}


// ── Inspection of the new site ──────────────────────────────────────────────

/**
 * Schedule the visit. A terminal added to a live operator is still a site
 * nobody from the Ministry has seen, so it is inspected before it can become
 * a park — the same reason a first application is inspected.
 *
 * The Inspection record is polymorphic; a terminal is linked as "TERMINAL"
 * so it is never confused with the company-wide inspection.
 */
/**
 * Who may be put on a terminal inspection team.
 *
 * The same pool a revalidation inspection draws from, so the HOD sees one
 * list of officers rather than a shorter one here and a longer one there.
 * The signed-in HOD is excluded: they attend automatically and listing them
 * only invites someone to spend one of three seats on a person already in
 * the room.
 */
export async function getTerminalTeamCandidates() {
  const authz = await authorize(["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false as const, error: authz.error };

  const officers = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: authz.session.userId },
      role: {
        in: [
          "FIELD_INSPECTOR",
          "VEHICLE_INSPECTION_OFFICER",
          "HOD_VIS",
          "HOD_TRANSPORT_OPS",
          "HOD_PARKS",
          "HOD_PARKS_REVALIDATION",
          "PARK_MONITOR",
        ],
      },
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  return { success: true as const, data: officers };
}

/**
 * A terminal is inspected by a team, not a lone officer.
 *
 * The same shape as a revalidation inspection, deliberately: the HOD of
 * Operations occupies one seat automatically whether or not they tick their
 * own name, two to four officers attend, and one of them is the lead. Only
 * the lead files the checklist and findings; everyone else leaves a comment
 * the HOD reads before recommending.
 *
 * Keeping the two identical means an officer learns the process once.
 */
const MIN_TEAM = 2;
const MAX_TEAM = 4;

export async function scheduleAddedTerminalInspection(
  terminalId: string,
  input: {
    scheduledDate: string;
    memberIds: string[];
    leadId: string;
    station?: string;
  },
) {
  const authz = await authorize(["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the HOD of Operations can schedule an inspection.",
    };
  }

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: {
      applicationStatus: true,
      companyId: true,
      terminalNumber: true,
      company: { select: { companyName: true } },
    },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  if (!["SUBMITTED", "REJECTED", "UNDER_REVIEW"].includes(terminal.applicationStatus)) {
    return {
      success: false,
      error: `Cannot schedule an inspection - the terminal is currently ${terminal.applicationStatus}.`,
    };
  }

  const scheduledDate = new Date(input.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { success: false, error: "Choose an inspection date in the future." };
  }

  // The HOD always attends, whether or not they ticked their own name.
  const team = Array.from(
    new Set([...(input.memberIds ?? []), authz.session.userId]),
  ).filter(Boolean);

  if (team.length < MIN_TEAM) {
    return {
      success: false,
      error: `An inspection needs at least ${MIN_TEAM} officers - select at least one besides yourself.`,
    };
  }
  if (team.length > MAX_TEAM) {
    return {
      success: false,
      error: `An inspection team may hold at most ${MAX_TEAM} officers (you are counted automatically).`,
    };
  }
  if (!input.leadId || !team.includes(input.leadId)) {
    return {
      success: false,
      error: "The lead inspector must be one of the selected officers.",
    };
  }

  const found = await db.user.count({
    where: { id: { in: team }, isActive: true },
  });
  if (found !== team.length) {
    return { success: false, error: "One or more selected officers are invalid." };
  }

  // Five working days, matching the terminal inspection SLA.
  const dueAt = new Date(scheduledDate);
  let added = 0;
  while (added < 5) {
    dueAt.setDate(dueAt.getDate() + 1);
    const day = dueAt.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  const inspection = await db.inspection.create({
    data: {
      inspectionType: "INITIAL",
      linkedEntityType: "TERMINAL",
      linkedEntityId: terminalId,
      scheduledDate,
      scheduledByUserId: authz.session.userId,
      assignedToUserId: input.leadId,
      // Required by the model but only meaningful once the report is filed;
      // it is overwritten with the real inspector on completion.
      completedByUserId: input.leadId,
      inspectorStationLocation: input.station || null,
    },
    select: { id: true },
  });

  await db.$transaction([
    // Replace any previous team - rescheduling starts the visit afresh.
    db.terminalInspector.deleteMany({ where: { terminalId } }),
    db.terminalInspector.createMany({
      data: team.map((userId) => ({
        terminalId,
        userId,
        isLead: userId === input.leadId,
      })),
    }),
    db.terminal.update({
      where: { id: terminalId },
      data: {
        applicationStatus: "INSPECTION_SCHEDULED",
        inspectionDueAt: dueAt,
        rejectionReason: null,
      },
    }),
  ]);

  await recordAudit({
    action: "TERMINAL_INSPECTION_SCHEDULED",
    entityType: "MASS_TRANSIT",
    entityId: terminal.companyId,
    changeDescription: `Inspection scheduled for terminal ${terminal.terminalNumber} of ${terminal.company.companyName} on ${scheduledDate.toDateString()} - ${team.length} officers, lead assigned`,
    newValues: { inspectionId: inspection.id, team: team.length, leadId: input.leadId },
  });

  revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true, data: { inspectionId: inspection.id } };
}

/**
 * A team member who is not the lead records what they saw.
 *
 * The HOD reads these alongside the lead's checklist, so a disagreement on
 * site reaches the decision rather than being settled in the car park.
 */
export async function commentOnTerminalInspection(
  terminalId: string,
  comment: string,
) {
  const session = await requireAuth();

  if (!comment?.trim()) {
    return { success: false, error: "Write what you observed." };
  }

  const membership = await db.terminalInspector.findFirst({
    where: { terminalId, userId: session.userId },
    select: { id: true, isLead: true },
  });
  if (!membership) {
    return { success: false, error: "You are not on this inspection team." };
  }

  await db.terminalInspector.update({
    where: { id: membership.id },
    data: { comment: comment.trim(), commentedAt: new Date() },
  });

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: { companyId: true, terminalNumber: true },
  });

  await recordAudit({
    action: "TERMINAL_INSPECTION_COMMENT",
    entityType: "MASS_TRANSIT",
    entityId: terminal?.companyId ?? terminalId,
    changeDescription: `Team member commented on terminal ${terminal?.terminalNumber ?? ""} inspection`,
  });

  if (terminal) revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true };
}

/**
 * File the report. Only the lead does this - the others comment.
 *
 * Once it is in, the terminal is ready for the HOD, which is the only door
 * into the approval chain.
 */
export async function completeAddedTerminalInspection(
  terminalId: string,
  input: { findings: string; checklist?: unknown; evidenceUrls?: unknown },
) {
  const session = await requireAuth();

  if (!input.findings?.trim()) {
    return { success: false, error: "Record what was found at the site." };
  }

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: {
      applicationStatus: true,
      companyId: true,
      terminalNumber: true,
      company: { select: { companyName: true } },
      inspectionTeam: { select: { userId: true, isLead: true } },
    },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  const isLead = terminal.inspectionTeam.some(
    (m) => m.userId === session.userId && m.isLead,
  );
  // A System Admin can file on the team's behalf when something has gone
  // wrong on site; nobody else can.
  const isOverride = session.role === "SYSTEM_ADMIN";

  if (!isLead && !isOverride) {
    return {
      success: false,
      error:
        "Only the lead inspector files the report. If you attended, leave a comment instead.",
    };
  }

  if (terminal.applicationStatus !== "INSPECTION_SCHEDULED") {
    return {
      success: false,
      error: `No inspection is outstanding for this terminal (currently ${terminal.applicationStatus}).`,
    };
  }

  const inspection = await db.inspection.findFirst({
    where: { linkedEntityType: "TERMINAL", linkedEntityId: terminalId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (inspection) {
    await db.inspection.update({
      where: { id: inspection.id },
      data: {
        status: "COMPLETED",
        completedByUserId: session.userId,
        overallAssessment: input.findings.trim(),
        inspectionEndTime: new Date(),
        ...(input.checklist ? { inspectionChecklist: input.checklist as never } : {}),
        ...(input.evidenceUrls ? { evidenceUrls: input.evidenceUrls as never } : {}),
      },
    });
  }

  await db.terminal.update({
    where: { id: terminalId },
    data: {
      applicationStatus: "INSPECTION_COMPLETED",
      inspectionStatus: "COMPLETED",
    },
  });

  await recordAudit({
    action: "TERMINAL_INSPECTION_COMPLETED",
    entityType: "MASS_TRANSIT",
    entityId: terminal.companyId,
    changeDescription: `Inspection filed for terminal ${terminal.terminalNumber} of ${terminal.company.companyName}`,
    newValues: { applicationStatus: "INSPECTION_COMPLETED" },
  });

  revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true };
}

// ── The approval chain ──────────────────────────────────────────────────────

const STAGE = {
  HOD: {
    roles: ["HOD_TRANSPORT_OPS", "HOD_PARKS", "SYSTEM_ADMIN"] as const,
    // The inspection has to be filed before the HOD can recommend — that is
    // the whole point of inspecting a new site before it becomes a park.
    from: ["INSPECTION_COMPLETED"],
    to: "PENDING_PS_APPROVAL" as const,
    field: "hodApprovedAt",
    by: "hodApprovedByUserId",
    label: "HOD",
  },
  PS: {
    roles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"] as const,
    from: ["PENDING_PS_APPROVAL"],
    to: "PENDING_COMMISSIONER_APPROVAL" as const,
    field: "psApprovedAt",
    by: "psApprovedByUserId",
    label: "Permanent Secretary",
  },
};

async function advance(
  terminalId: string,
  stage: (typeof STAGE)[keyof typeof STAGE],
) {
  const authz = await authorize([...stage.roles]);
  if (!authz.ok) return { success: false, error: authz.error };

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: {
      applicationStatus: true,
      terminalNumber: true,
      companyId: true,
      company: { select: { companyName: true } },
    },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  if (!stage.from.includes(terminal.applicationStatus)) {
    return {
      success: false,
      error: `This terminal is not awaiting ${stage.label} approval (currently ${terminal.applicationStatus}).`,
    };
  }

  await db.terminal.update({
    where: { id: terminalId },
    data: {
      applicationStatus: stage.to,
      [stage.field]: new Date(),
      [stage.by]: authz.session.userId,
    },
  });

  await recordAudit({
    action: "TERMINAL_APPROVAL_ADVANCED",
    entityType: "MASS_TRANSIT",
    entityId: terminal.companyId,
    changeDescription: `${stage.label} approved terminal ${terminal.terminalNumber} of ${terminal.company.companyName}`,
    oldValues: { applicationStatus: terminal.applicationStatus },
    newValues: { applicationStatus: stage.to },
  });

  revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true };
}

export async function hodApproveTerminal(terminalId: string) {
  return advance(terminalId, STAGE.HOD);
}

export async function psApproveTerminal(terminalId: string) {
  return advance(terminalId, STAGE.PS);
}

/**
 * Final approval. The terminal becomes a motor park, exactly as terminals
 * declared on the original application do — same Park ID sequence, same
 * permit numbering under the parent company — so it inherits park staff,
 * inspections, revalidation and its own letter of authority.
 */
export async function commissionerApproveTerminal(terminalId: string) {
  const authz = await authorize(["COMMISSIONER", "SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    include: { company: true },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  if (terminal.applicationStatus !== "PENDING_COMMISSIONER_APPROVAL") {
    return {
      success: false,
      error: `This terminal is not awaiting your approval (currently ${terminal.applicationStatus}).`,
    };
  }
  if (terminal.motorParkId) {
    return { success: false, error: "This terminal is already a park." };
  }

  const company = terminal.company;
  const isTemporal = company.applicationStatus === "TEMPORAL_APPROVAL";

  // A terminal is only ever as approved as its company, and runs to the same
  // expiry — a site cannot outlive the permit it sits under.
  const validityMonths =
    (await getNumberSetting(
      isTemporal
        ? "masstransit.validity.temporalMonths"
        : "masstransit.validity.permanentMonths",
    )) || (isTemporal ? 6 : 12);

  const now = new Date();
  const expiresAt = company.permitExpiresAt ?? new Date();
  if (!company.permitExpiresAt) {
    expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
  }

  const parkId = await nextParkId();

  await db.$transaction(async (tx) => {
    const park = await tx.motorPark.create({
      data: {
        businessName: company.companyName,
        transportCompanyName: terminalDesignation(
          company.companyName,
          terminal.terminalNumber,
        ),
        streetAddress: terminal.locationAddress,
        // The terminal record carries a single address line; the LGA and town
        // are filled in by the HOD on the park record afterwards.
        lga: "",
        townCity: "",
        anssidNumber: `${company.asinNumber ?? company.id}-T${terminal.terminalNumber}`,
        cacRegistrationNumber: company.cacNumber,
        parkId,

        contactUserId: company.contactUserId,
        contactPerson: terminal.managerName || company.contactPerson || "",
        contactPhone: terminal.managerPhone || company.contactPhone || "",
        contactEmail: terminal.managerEmail || company.contactEmail || "",
        managerResidentialAddress: terminal.managerResidentialAddress,

        landOwnershipDocId: company.landOwnershipDocId,
        cacDocumentId: company.cacDocumentId,
        corporateAsinDocumentId: company.corporateAsinDocumentId,
        // This site's own photographs, captured when the terminal was added.
        toiletPhotoId: terminal.toiletPhotoId,
        waitingAreaPhotoId: terminal.waitingAreaPhotoId,
        signagePhotoId: terminal.signagePhotoId,
        waterFacilityPhotoId: terminal.waterFacilityPhotoId,
        cctvPhotoId: terminal.cctvPhotoId,

        applicationStatus: isTemporal ? "TEMPORAL_APPROVAL" : "APPROVED",
        permitStatus: "ACTIVE",
        permitNumber: `${company.permitNumber ?? company.id}/T${terminal.terminalNumber}`,
        permitIssuedAt: now,
        permitExpiresAt: expiresAt,
        nextRevalidationDue: expiresAt,
        monthlyLevyAmount: company.monthlyLevyAmount,
        approvedAt: now,
        // The terminal passed HOD, PS and Commissioner in its own right, so
        // the park it becomes shows those signatures rather than three blanks.
        hodApprovedAt: terminal.hodApprovedAt,
        psApprovedAt: terminal.psApprovedAt,
        commissionerApprovedAt: now,
        approvedByUserId: authz.session.userId,
      },
      select: { id: true },
    });

    await tx.terminal.update({
      where: { id: terminal.id },
      data: {
        motorParkId: park.id,
        applicationStatus: isTemporal ? "TEMPORAL_APPROVAL" : "APPROVED",
        commissionerApprovedAt: now,
        approvedAt: now,
        approvedByUserId: authz.session.userId,
      },
    });
  });

  await recordAudit({
    action: "TERMINAL_APPROVED",
    entityType: "MASS_TRANSIT",
    entityId: company.id,
    changeDescription: `Commissioner approved terminal ${terminal.terminalNumber} of ${company.companyName}; park ${parkId} created`,
    newValues: { terminalId: terminal.id, parkId },
  });

  revalidatePath(`/fleet-operators/${company.id}`);
  revalidatePath("/motor-parks");
  return { success: true, data: { parkId } };
}

/**
 * Send a terminal back with a reason. It returns to the operator to correct
 * and resubmit rather than dying where it stands.
 */
export async function rejectTerminal(terminalId: string, reason: string) {
  const authz = await authorize([
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS",
    "PERMANENT_SECRETARY",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
    "ADMIN",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!reason?.trim()) {
    return {
      success: false,
      error: "A reason is required — the operator needs to know what to fix.",
    };
  }

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: {
      applicationStatus: true,
      terminalNumber: true,
      companyId: true,
      motorParkId: true,
      company: { select: { companyName: true } },
    },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  if (terminal.motorParkId) {
    return {
      success: false,
      error: "This terminal is already an approved park and cannot be rejected.",
    };
  }

  await db.terminal.update({
    where: { id: terminalId },
    data: {
      applicationStatus: "REJECTED",
      rejectionReason: reason.trim(),
      hodApprovedAt: null,
      psApprovedAt: null,
    },
  });

  await recordAudit({
    action: "TERMINAL_REJECTED",
    entityType: "MASS_TRANSIT",
    entityId: terminal.companyId,
    changeDescription: `${authz.session.role} returned terminal ${terminal.terminalNumber} of ${terminal.company.companyName}: ${reason.trim()}`,
    oldValues: { applicationStatus: terminal.applicationStatus },
    newValues: { applicationStatus: "REJECTED" },
  });

  revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true };
}

/** Put a returned terminal back into the chain once it has been corrected. */
export async function resubmitTerminal(terminalId: string) {
  const session = await requireAuth();

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    select: {
      applicationStatus: true,
      companyId: true,
      terminalNumber: true,
      company: { select: { contactUserId: true, companyName: true } },
    },
  });
  if (!terminal) return { success: false, error: "Terminal not found." };

  if (
    session.role === "EXTERNAL_APPLICANT" &&
    terminal.company.contactUserId !== session.userId
  ) {
    return { success: false, error: "This is not your company." };
  }

  if (terminal.applicationStatus !== "REJECTED") {
    return { success: false, error: "This terminal has not been returned." };
  }

  await db.terminal.update({
    where: { id: terminalId },
    data: { applicationStatus: "SUBMITTED", rejectionReason: null },
  });

  await recordAudit({
    action: "TERMINAL_RESUBMITTED",
    entityType: "MASS_TRANSIT",
    entityId: terminal.companyId,
    changeDescription: `Terminal ${terminal.terminalNumber} of ${terminal.company.companyName} resubmitted`,
    newValues: { applicationStatus: "SUBMITTED" },
  });

  revalidatePath(`/fleet-operators/${terminal.companyId}`);
  return { success: true };
}
