/**
 * Driver ID card approvals.
 *
 * Shared by the three offices in the chain — VIO, Ag. MD/CEO and Commissioner.
 * The queue shown is determined by the viewer's role, so no office can act on
 * another's stage.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getIdCardQueue } from "@/app/actions/tracas-id-cards";
import { IdCardApprovalsClient } from "./id-card-approvals-client";

export const metadata = {
  title: "Driver ID Card Approvals — Ministry of Transport",
};

export default async function IdCardApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await getIdCardQueue();
  if (!res.success) redirect("/unauthorized");

  return <IdCardApprovalsClient data={res.data} role={session.role} />;
}
