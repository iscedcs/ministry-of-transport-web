import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listFeeSchedules } from "@/app/actions/admin";
import { FeeScheduleClient } from "./fee-client";

export default async function FeeSchedulePage() {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const result = await listFeeSchedules();
  const fees = result.success ? result.data! : [];

  return <FeeScheduleClient initialFees={fees} />;
}
