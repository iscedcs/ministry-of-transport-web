import { getTracasFleetData } from "@/app/actions/tracas";
import { getSession } from "@/lib/auth";
import TracasClient from "./tracas-client";

export default async function TracasDashboardPage() {
  const [res, session] = await Promise.all([getTracasFleetData(), getSession()]);

  const vehicles = res.success && res.vehicles ? res.vehicles : [];
  const drivers = res.success && res.drivers ? res.drivers : [];
  const stickers = res.success && res.stickers ? res.stickers : [];

  return (
    <TracasClient
      initialVehicles={vehicles as any}
      initialDrivers={drivers as any}
      initialStickers={stickers as any}
      currentUserRole={session?.role ?? null}
    />
  );
}
