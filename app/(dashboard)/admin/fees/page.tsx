import { redirect } from "next/navigation";
import { requireRole, getSession } from "@/lib/auth";
import { listFeeSchedules } from "@/app/actions/admin";
import { FeeScheduleClient } from "./fee-client";

export default async function FeeSchedulePage() {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const [result, session] = await Promise.all([listFeeSchedules(), getSession()]);
  const fees = result.success ? result.data! : [];

  // The Administrator consults the fee schedule; only the PS and System Admin
  // set it. createFeeSchedule/toggleFeeScheduleActive enforce this server-side.
  const canManage =
    session?.role === "PERMANENT_SECRETARY" || session?.role === "SYSTEM_ADMIN";

  return <FeeScheduleClient initialFees={fees} canManage={canManage} />;
}
