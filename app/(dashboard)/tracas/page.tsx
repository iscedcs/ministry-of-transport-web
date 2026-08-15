import { getTracasFleetData } from "@/app/actions/tracas";
import type { TracasTabKey } from "@/lib/query-limits";
import { getSession } from "@/lib/auth";
import TracasClient from "./tracas-client";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    enrollment?: string;
  }>;
}

const TABS: TracasTabKey[] = ["vehicles", "drivers", "stickers"];

export default async function TracasDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const tab = TABS.includes(sp.tab as TracasTabKey)
    ? (sp.tab as TracasTabKey)
    : "vehicles";
  const enrollment =
    sp.enrollment === "NEW_JOINER" || sp.enrollment === "EXISTING"
      ? sp.enrollment
      : "ALL";

  const [res, session] = await Promise.all([
    getTracasFleetData({
      tab,
      page: Number(sp.page ?? 1) || 1,
      search: sp.q ?? "",
      enrollment,
    }),
    getSession(),
  ]);

  const ok = res.success === true;

  return (
    <TracasClient
      initialVehicles={(ok && "vehicles" in res ? res.vehicles : []) as never}
      initialDrivers={(ok && "drivers" in res ? res.drivers : []) as never}
      initialStickers={(ok && "stickers" in res ? res.stickers : []) as never}
      pools={
        (ok && "pools" in res
          ? res.pools
          : { availableDrivers: [], availableStickers: [] }) as never
      }
      stats={
        (ok && "stats" in res
          ? res.stats
          : {
              vehicleTotal: 0,
              driverTotal: 0,
              stickerTotal: 0,
              newJoinerCount: 0,
              activeVehicleCount: 0,
              availableStickerCount: 0,
            }) as never
      }
      pagination={
        (ok && "pagination" in res
          ? res.pagination
          : { tab, page: 1, pageSize: 25, total: 0, totalPages: 1 }) as never
      }
      currentUserRole={session?.role ?? null}
    />
  );
}
