"use server";

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { FLEET_VIEW_ROLES } from "@/lib/fleet-roles";
import {
  VEHICLE_KINDS,
  vehicleKindOf,
  type FleetType,
  type VehicleKind,
} from "@/lib/tracas-fleet";

/**
 * The TRACAS fleet, broken down.
 *
 *   total
 *   ├─ FT (state fleet)   ─ Sienna / Shuttle / Bus / Minibus / Truck / Other
 *   └─ LV (private)       ─ Sienna / Shuttle / Bus / Minibus / Truck / Other
 *   and the same kinds across the whole fleet.
 *
 * Counted in the database, grouped on (category, make/model), so cost does not
 * grow with the register; the kind is then read from each distinct spelling
 * (lib/tracas-fleet.ts). Embargoed vehicles are not here: they are not
 * registered, so they are not in the fleet.
 */

export interface KindCount {
  key: VehicleKind;
  label: string;
  count: number;
}

export interface FleetTypeBreakdown {
  type: FleetType;
  label: string;
  total: number;
  kinds: KindCount[];
}

export interface TracasFleetBreakdown {
  total: number;
  /** FT, LV and (only if any exist) vehicles numbered some other way. */
  byFleetType: FleetTypeBreakdown[];
  /** The kinds across the whole fleet, with the FT / LV split of each. */
  byKind: (KindCount & { ft: number; lv: number; other: number })[];
  /** What landed in "Other / unclassified", so a missing rule can be spotted. */
  unclassified: { value: string; count: number }[];
  embargoActive: number;
}

const FT_WHERE = { fleetNumber: { startsWith: "FT", mode: "insensitive" as const } };
const LV_WHERE = { fleetNumber: { startsWith: "LV", mode: "insensitive" as const } };
const OTHER_WHERE = { NOT: [FT_WHERE, LV_WHERE] };

export async function getTracasFleetBreakdown(): Promise<
  { success: true; data: TracasFleetBreakdown } | { success: false; error: string }
> {
  const authz = await authorize(FLEET_VIEW_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const group = (where: object) =>
    db.tracasVehicle.groupBy({
      by: ["category", "makeModel"],
      where,
      _count: { _all: true },
    });

  const [ft, lv, other, embargoActive] = await Promise.all([
    group(FT_WHERE),
    group(LV_WHERE),
    group(OTHER_WHERE),
    db.tracasEmbargo.count({ where: { status: "ACTIVE" } }),
  ]);

  const unclassified = new Map<string, number>();

  const tally = (rows: typeof ft) => {
    const counts = new Map<VehicleKind, number>();
    for (const r of rows) {
      const kind = vehicleKindOf(r.category, r.makeModel);
      counts.set(kind, (counts.get(kind) ?? 0) + r._count._all);
      if (kind === "OTHER") {
        const v = (r.category || r.makeModel || "(blank)").trim();
        unclassified.set(v, (unclassified.get(v) ?? 0) + r._count._all);
      }
    }
    return counts;
  };

  const tallies: Record<FleetType, Map<VehicleKind, number>> = {
    FT: tally(ft),
    LV: tally(lv),
    OTHER: tally(other),
  };

  const kindsOf = (t: FleetType): KindCount[] =>
    VEHICLE_KINDS.map((k) => ({
      key: k.key,
      label: k.label,
      count: tallies[t].get(k.key) ?? 0,
    }));
  const sum = (ks: KindCount[]) => ks.reduce((n, k) => n + k.count, 0);

  const labels: Record<FleetType, string> = {
    FT: "State fleet (FT)",
    LV: "Private / licensed (LV)",
    OTHER: "Other numbering",
  };

  const byFleetType: FleetTypeBreakdown[] = (["FT", "LV", "OTHER"] as FleetType[])
    .map((type) => {
      const kinds = kindsOf(type);
      return { type, label: labels[type], total: sum(kinds), kinds };
    })
    // FT and LV always show, even at zero: "how many FTs do we have" has the
    // answer 0 today and the page should say so rather than omit the row.
    .filter((t) => t.type !== "OTHER" || t.total > 0);

  const byKind = VEHICLE_KINDS.map((k) => {
    const ftN = tallies.FT.get(k.key) ?? 0;
    const lvN = tallies.LV.get(k.key) ?? 0;
    const otherN = tallies.OTHER.get(k.key) ?? 0;
    return {
      key: k.key,
      label: k.label,
      count: ftN + lvN + otherN,
      ft: ftN,
      lv: lvN,
      other: otherN,
    };
  });

  return {
    success: true,
    data: {
      total: byFleetType.reduce((n, t) => n + t.total, 0),
      byFleetType,
      byKind,
      unclassified: [...unclassified.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      embargoActive,
    },
  };
}
