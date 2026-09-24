import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import {
  buildTerminalChecklist,
  parseTerminalChecklist,
} from "@/lib/terminal-checklist";
import { TerminalInspectionClient } from "./terminal-inspection-client";

export const metadata = {
  title: "Terminal Inspection Report — Ministry of Transport",
};

/**
 * Terminal / depot inspection.
 *
 * The inspector works a checklist and attaches photographs, rather than
 * typing one free-text box — the HOD needs something specific to weigh, and
 * the record needs to show what was actually looked at.
 */
export default async function TerminalInspectionPage({
  params,
}: {
  params: Promise<{ id: string; inspectionId: string }>;
}) {
  const { id, inspectionId } = await params;

  const authz = await authorize([
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER",
    "HOD_TRANSPORT_OPS",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) redirect("/unauthorized");

  const [company, inspection] = await Promise.all([
    db.massTransitCompany.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        terminals: {
          // The declared facilities and the Section F/G answers are what the
          // checklist compares against. Fetching only the address meant the
          // inspector saw "Not declared" beside every facility the operator
          // had actually claimed.
          select: {
            locationAddress: true,
            facilitiesAvailable: true,
            maintainsManifest: true,
            operatorsRegistered: true,
            paymentsUpToDate: true,
            safetySignages: true,
            pendingSanctions: true,
            sanctionDetails: true,
            managementStaffCount: true,
            adminStaffCount: true,
            securityStaffCount: true,
            otherStaffCount: true,
            securityArrangement: true,
            operationalStatus: true,
            dailyVehiclesCount: true,
          },
          orderBy: { terminalNumber: "asc" },
          take: 1,
        },
      },
    }),
    db.inspection.findUnique({
      where: { id: inspectionId },
      select: { id: true, inspectionChecklist: true, status: true },
    }),
  ]);

  if (!company || !inspection) notFound();

  // Resume a part-completed checklist, otherwise derive a fresh one from what
  // the operator declared.
  const site = company.terminals[0];
  const declaredFacilities = (() => {
    const raw = site?.facilitiesAvailable;
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
    if (raw && typeof raw === "object") {
      return Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
    }
    return [];
  })();

  const saved = parseTerminalChecklist(inspection.inspectionChecklist);
  const checklist =
    saved.length > 0
      ? saved
      : buildTerminalChecklist(declaredFacilities, site ?? {});

  return (
    <TerminalInspectionClient
      companyId={company.id}
      inspectionId={inspection.id}
      companyName={company.companyName}
      terminalLocation={company.terminals[0]?.locationAddress ?? ""}
      initialChecklist={checklist}
    />
  );
}
