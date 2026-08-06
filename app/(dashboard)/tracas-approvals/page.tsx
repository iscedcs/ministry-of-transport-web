/**
 * TRACAS dashboard — the Ag. MD/CEO's landing page.
 *
 * Her remit is the whole company, so this covers the fleet, drivers, sticker
 * inventory and recent activity alongside the letters awaiting her signature.
 * The Commissioner uses the same page for his approval stage; the queue shown
 * is determined by the viewer's role, so neither can act on the other's step.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getLetterApprovalQueue,
  getTracasOverview,
} from "@/app/actions/tracas-approvals";
import { ApprovalsClient } from "./approvals-client";

export const metadata = {
  title: "TRACAS Dashboard — Ministry of Transport",
};

export default async function TracasApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [queueRes, overviewRes] = await Promise.all([
    getLetterApprovalQueue(),
    getTracasOverview(),
  ]);

  if (!queueRes.success) redirect("/unauthorized");

  return (
    <ApprovalsClient
      data={queueRes.data}
      overview={overviewRes.success ? overviewRes.data : null}
      role={session.role}
    />
  );
}
