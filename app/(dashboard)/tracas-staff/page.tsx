/**
 * TRACAS Staff — the Ag. MD/CEO provisions her own printing officers here,
 * without needing Ministry admin access.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listTracasStaff } from "@/app/actions/tracas-staff";
import { TracasStaffClient } from "./tracas-staff-client";

export const metadata = {
  title: "TRACAS Staff — Ministry of Transport",
};

export default async function TracasStaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await listTracasStaff();
  if (!res.success) redirect("/unauthorized");

  const canManage =
    session.role === "TRACAS_MD" || session.role === "SYSTEM_ADMIN";

  return <TracasStaffClient
      staff={res.data}
      canManage={canManage}
      role={session.role}
    />;
}
