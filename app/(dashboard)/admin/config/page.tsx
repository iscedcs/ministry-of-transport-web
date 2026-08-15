import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listSystemConfig } from "@/app/actions/admin";
import { getFleetNumberingReport } from "@/app/actions/fleet-numbering";
import { SETTINGS, SETTING_GROUPS, getAllSettings } from "@/lib/system-config";
import { SystemConfigClient } from "./config-client";
import { SettingsPanel } from "./settings-panel";
import { FleetPanel } from "./fleet-panel";
import { ConfigTabs } from "./config-tabs";

export const metadata = {
  title: "System Configuration — Ministry of Transport",
};

export default async function SystemConfigPage() {
  try {
    await requireRole(["SYSTEM_ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const [result, settings, fleet, vehicles] = await Promise.all([
    listSystemConfig(),
    getAllSettings(),
    getFleetNumberingReport(),
    db.tracasVehicle.findMany({
      select: {
        id: true,
        fleetNumber: true,
        registrationNumber: true,
        ownershipType: true,
      },
      orderBy: { fleetNumber: "asc" },
    }),
  ]);

  const configs = result.success ? result.data! : [];

  const groups = SETTING_GROUPS.map((group) => ({
    group,
    settings: SETTINGS.filter((s) => s.group === group),
  })).filter((g) => g.settings.length > 0);

  return (
    <ConfigTabs
      controls={<SettingsPanel groups={groups} initial={settings} />}
      fleet={
        fleet.success && fleet.data ? (
          <FleetPanel report={fleet.data} vehicles={vehicles} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fleet numbering is unavailable: {fleet.error}
          </p>
        )
      }
      advanced={<SystemConfigClient initialConfigs={configs} />}
    />
  );
}
