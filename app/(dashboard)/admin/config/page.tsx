import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listSystemConfig } from "@/app/actions/admin";
import { SystemConfigClient } from "./config-client";

export default async function SystemConfigPage() {
  try {
    await requireRole(["SYSTEM_ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const result = await listSystemConfig();
  const configs = result.success ? result.data! : [];

  return <SystemConfigClient initialConfigs={configs} />;
}
