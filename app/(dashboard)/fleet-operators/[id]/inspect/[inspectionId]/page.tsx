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
          select: { locationAddress: true },
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

  // Resume a part-completed checklist, otherwise derive a fresh one.
  const saved = parseTerminalChecklist(inspection.inspectionChecklist);
  const checklist = saved.length > 0 ? saved : buildTerminalChecklist();

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
