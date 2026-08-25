/**
 * What an applicant actually needs to see when they sign in.
 *
 * The applicant dashboard showed four counters — most of them zero — and a row
 * of links. It never told them they had vehicles outstanding, never showed
 * their staff, and never surfaced a letter or certificate the Ministry had
 * issued them. Everything they came to do was two or three clicks away behind
 * a generic menu.
 *
 * This gathers the three things that matter: what is waiting on THEM, what
 * they hold, and what they can print.
 */

import { db } from "@/lib/db";
import { getRevalidationDueAssets } from "@/lib/revalidation-due";
import { getRevalidatedParkIds } from "@/lib/park-approval-origin";

export interface ActionItem {
  key: string;
  label: string;
  hint: string;
  count?: number;
  href: string;
  tone: "urgent" | "action";
}

export interface DocumentItem {
  key: string;
  title: string;
  subtitle: string;
  reference: string | null;
  href: string;
  kind: "letter" | "certificate";
}

export interface ApplicantDashboard {
  /** Waiting on the applicant. */
  actions: ActionItem[];
  /** Parks, terminals and companies they hold. */
  holdings: {
    key: string;
    name: string;
    status: string;
    location: string | null;
    staffCount: number;
    href: string;
    staffHref: string | null;
  }[];
  /** Issued documents they can print or download. */
  documents: DocumentItem[];
  stats: {
    parks: number;
    companies: number;
    revalidations: number;
    staff: number;
  };
}

/**
 * What a terminal's status means to the operator waiting on it.
 *
 * A terminal added to an approved company runs its own chain, and until it
 * becomes a park it appears nowhere else on this dashboard — it is not a park
 * yet, and the company it belongs to was approved long ago.
 */
const TERMINAL_STAGE: Record<string, string> = {
  SUBMITTED: "Submitted — the Ministry will schedule an inspection",
  UNDER_REVIEW: "Under review",
  INSPECTION_SCHEDULED: "Inspection scheduled",
  INSPECTION_COMPLETED: "Inspected — with the HOD for recommendation",
  PENDING_PS_APPROVAL: "With the Permanent Secretary",
  PENDING_COMMISSIONER_APPROVAL: "With the Commissioner for approval",
};

const APPROVED = ["APPROVED", "TEMPORAL_APPROVAL"];

export async function getApplicantDashboard(
  userId: string,
): Promise<ApplicantDashboard> {
  const [parks, companies, revalidations] = await Promise.all([
    db.motorPark.findMany({
      where: { contactUserId: userId },
      select: {
        id: true,
        businessName: true,
        applicationStatus: true,
        townCity: true,
        lga: true,
        parkId: true,
        permitNumber: true,
        permitExpiresAt: true,
        _count: { select: { parkStaff: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.massTransitCompany.findMany({
      where: { contactUserId: userId },
      select: {
        id: true,
        companyName: true,
        applicationStatus: true,
        permitNumber: true,
        permitExpiresAt: true,
        vehicleSubmissionReqs: {
          orderBy: { requestedAt: "desc" },
          take: 1,
          select: {
            id: true,
            vehicleCount: true,
            _count: { select: { vehicles: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.revalidationApplication.findMany({
      where: { applicantUserId: userId },
      select: {
        id: true,
        parkName: true,
        status: true,
        revalidationNumber: true,
        approvalType: true,
        rejectionReason: true,
        validUntil: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  // Terminals the operator has added that have not yet become parks. Once
  // approved a terminal IS a park and appears under holdings, so only the
  // in-flight ones are collected here.
  const pendingTerminals = await db.terminal.findMany({
    where: {
      company: { contactUserId: userId },
      motorParkId: null,
      applicationStatus: { notIn: ["APPROVED", "TEMPORAL_APPROVAL"] },
    },
    select: {
      id: true,
      terminalNumber: true,
      locationAddress: true,
      applicationStatus: true,
      rejectionReason: true,
      companyId: true,
      company: { select: { companyName: true } },
    },
    orderBy: { terminalNumber: "asc" },
  });

  const actions: ActionItem[] = [];
  const documents: DocumentItem[] = [];

  // ── Terminals awaiting a decision, or sent back ──────────────────────────
  for (const t of pendingTerminals) {
    const returned = t.applicationStatus === "REJECTED";
    actions.push({
      key: `terminal-${t.id}`,
      label: returned
        ? `Terminal ${t.terminalNumber} returned for correction`
        : `Terminal ${t.terminalNumber} — ${t.company.companyName}`,
      hint: returned
        ? t.rejectionReason ?? "A reason has been given. Correct it and resubmit."
        : `${t.locationAddress}. ${
            TERMINAL_STAGE[t.applicationStatus] ?? t.applicationStatus
          }.`,
      href: `/fleet-operators/${t.companyId}`,
      // A returned terminal needs them to act; one in the chain is progress
      // they should be able to see, not a task.
      tone: returned ? "urgent" : "action",
    });
  }

  // ── Approvals coming up for renewal ───────────────────────────────────────
  // The revalidation page already lists these, but an operator who does not
  // go looking will let one lapse. It belongs where they land.
  const { assets: dueAssets } = await getRevalidationDueAssets(userId);

  for (const asset of dueAssets) {
    if (asset.inProgress) continue;
    actions.push({
      key: `due-${asset.kind}-${asset.id}`,
      label: asset.overdue
        ? `${asset.name} — revalidation overdue`
        : `${asset.name} — revalidation due`,
      hint: asset.overdue
        ? `Lapsed on ${asset.dueAt.toDateString()}. Start the revalidation to bring it back into force.`
        : `Expires ${asset.dueAt.toDateString()} — ${asset.daysRemaining} day${
            asset.daysRemaining === 1 ? "" : "s"
          } left.`,
      // A countdown is the number that matters here, not a quantity.
      count: asset.overdue ? undefined : asset.daysRemaining,
      href: `/revalidation/apply?assetType=${asset.kind}&assetId=${asset.id}`,
      tone: "urgent",
    });
  }

  // ── Vehicles still to submit ──────────────────────────────────────────────
  for (const co of companies) {
    const req = co.vehicleSubmissionReqs[0];
    if (!req) continue;
    const outstanding = req.vehicleCount - req._count.vehicles;
    if (outstanding > 0) {
      actions.push({
        key: `veh-${co.id}`,
        label: `${outstanding} vehicle${outstanding === 1 ? "" : "s"} still to submit`,
        hint: `${co.companyName} — ${req._count.vehicles} of ${req.vehicleCount} submitted`,
        count: outstanding,
        href: "/fleet-operators/submit-vehicles",
        tone: "urgent",
      });
    }
  }

  // ── Anything sent back for correction ─────────────────────────────────────
  for (const r of revalidations) {
    if (r.status === "REJECTED" && r.rejectionReason) {
      actions.push({
        key: `rej-${r.id}`,
        label: "Revalidation returned for correction",
        hint: `${r.parkName} — a reason has been given`,
        href: "/revalidation",
        tone: "urgent",
      });
    }
  }

  // ── Documents they can print ──────────────────────────────────────────────
  for (const r of revalidations) {
    if (r.status !== "APPROVED" || !r.revalidationNumber) continue;
    documents.push({
      key: `rev-letter-${r.id}`,
      title: `${r.parkName} — approval letter`,
      subtitle:
        r.approvalType === "TEMPORAL" ? "Temporal approval" : "Full approval",
      reference: r.revalidationNumber,
      href: `/revalidation/${r.id}/certificate`,
      kind: "letter",
    });
    documents.push({
      key: `rev-cert-${r.id}`,
      title: `${r.parkName} — revalidation certificate`,
      subtitle: "Display at the park",
      reference: r.revalidationNumber,
      href: `/revalidation/${r.id}/park-certificate`,
      kind: "certificate",
    });
  }

  // Parks approved through revalidation already appear above as a
  // revalidation letter and certificate. Listing the motor park letter as
  // well gave the operator two documents for one decision.
  const revalidatedParkIds = await getRevalidatedParkIds(parks.map((p) => p.id));

  for (const p of parks) {
    if (!APPROVED.includes(p.applicationStatus)) continue;
    if (revalidatedParkIds.has(p.id)) continue;
    documents.push({
      key: `park-letter-${p.id}`,
      title: `${p.businessName} — approval letter`,
      subtitle:
        p.applicationStatus === "TEMPORAL_APPROVAL"
          ? "Temporal approval"
          : "Full approval",
      reference: p.parkId ?? p.permitNumber,
      href: `/motor-parks/${p.id}/approval-letter`,
      kind: "letter",
    });
    documents.push({
      key: `park-cert-${p.id}`,
      title: `${p.businessName} — park certificate`,
      subtitle:
        p.applicationStatus === "TEMPORAL_APPROVAL"
          ? "Temporal — display at the park"
          : "Display at the park",
      reference: p.parkId ?? p.permitNumber,
      href: `/motor-parks/${p.id}/park-certificate`,
      kind: "certificate",
    });
  }

  for (const co of companies) {
    if (!APPROVED.includes(co.applicationStatus)) continue;
    documents.push({
      key: `mt-letter-${co.id}`,
      title: `${co.companyName} — approval letter`,
      subtitle:
        co.applicationStatus === "TEMPORAL_APPROVAL"
          ? "Temporal approval"
          : "Full approval",
      reference: co.permitNumber,
      href: `/fleet-operators/${co.id}/approval-letter`,
      kind: "letter",
    });
  }

  const holdings = parks.map((p) => ({
    key: p.id,
    name: p.businessName,
    status: p.applicationStatus,
    location: [p.townCity, p.lga].filter(Boolean).join(", ") || null,
    staffCount: p._count.parkStaff,
    href: `/motor-parks/${p.id}`,
    // Staff can only be onboarded once the park is approved.
    staffHref: APPROVED.includes(p.applicationStatus)
      ? `/motor-parks/${p.id}/staff`
      : null,
  }));

  return {
    actions,
    holdings,
    documents,
    stats: {
      parks: parks.length,
      companies: companies.length,
      revalidations: revalidations.length,
      staff: parks.reduce((n, p) => n + p._count.parkStaff, 0),
    },
  };
}
