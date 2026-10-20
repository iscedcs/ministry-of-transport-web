/**
 * Global sticker registry — the single place that answers "what does this
 * scanned QR belong to?".
 *
 * Every physical sticker resolves through /v/[...code], which asks each source
 * below in order until one claims the code. Adding a new service that carries
 * stickers means adding ONE entry to STICKER_SOURCES — no new route, no new
 * action, no change on the transpaytms side.
 *
 * A source either points at an existing public page (`redirectTo`) or hands
 * back a small summary (`summary`) that the shared sticker page renders.
 */

import { db } from "@/lib/db";
import { extractStickerCode } from "@/lib/tracas-sticker";

export interface StickerSummary {
  /** Heading, e.g. "Towing Van" */
  service: string;
  /** Primary identifier shown large — usually the plate number */
  title: string;
  /** True when the vehicle currently holds a valid authorisation */
  authorised: boolean;
  /** Short status text shown beside the badge */
  statusLabel: string;
  facts: { label: string; value: string | null | undefined }[];
}

export type StickerHit =
  | { service: string; redirectTo: string }
  | { service: string; summary: StickerSummary };

interface StickerSource {
  /** Stable key, for logs only */
  key: string;
  resolve: (m: StickerMatch) => Promise<StickerHit | null>;
}

/**
 * What the scanned value could look like in the database. Stickers get stored
 * in three shapes depending on which form captured them: the bare code
 * (`status1772618713497`), the full URL, or an upper-cased copy of either.
 */
export interface StickerMatch {
  /** Bare code, e.g. status1772618713497 */
  code: string;
  /** Exact values to compare against, case-insensitively */
  exact: string[];
  /** Values a stored URL may end with, e.g. "/status1772618713497" */
  urlSuffixes: string[];
}

export function buildStickerMatch(raw: string): StickerMatch {
  const trimmed = raw.trim();
  const code = extractStickerCode(trimmed);

  // transpaytms issues both /v/status<digits> and /v/status/<digits>.
  const digits = /^status(\d{8,})$/i.exec(code)?.[1];

  return {
    code,
    exact: [...new Set([trimmed, code])].filter(Boolean),
    urlSuffixes: [...new Set([code, digits].filter(Boolean) as string[])].map(
      (c) => `/${c}`,
    ),
  };
}

/** Prisma filters for a nullable string column holding a sticker value. */
function stickerFilters(m: StickerMatch) {
  const insensitive = "insensitive" as const;
  return [
    ...m.exact.map((v) => ({ equals: v, mode: insensitive })),
    ...m.urlSuffixes.map((v) => ({ endsWith: v, mode: insensitive })),
  ];
}

const STICKER_SOURCES: StickerSource[] = [
  // ── Pooled stickers: imported ahead of time, bound to a record later ──
  {
    key: "tracas",
    async resolve(m) {
      const sticker = await db.tracasSticker.findFirst({
        where: {
          assignedVehicleId: { not: null },
          OR: [
            ...m.exact.map((v) => ({
              stickerCode: { equals: v, mode: "insensitive" as const },
            })),
            ...stickerFilters(m).map((f) => ({ stickerUrl: f })),
          ],
        },
        select: { id: true },
      });
      return sticker
        ? {
            service: "TRACAS",
            redirectTo: `/v/tracas/${encodeURIComponent(m.code)}`,
          }
        : null;
    },
  },
  {
    key: "boats",
    async resolve(m) {
      const sticker = await db.boatSticker.findFirst({
        where: {
          assignedBoatId: { not: null },
          OR: [
            ...m.exact.map((v) => ({
              stickerCode: { equals: v, mode: "insensitive" as const },
            })),
            ...stickerFilters(m).map((f) => ({ stickerUrl: f })),
          ],
        },
        select: { assignedBoatId: true },
      });
      return sticker?.assignedBoatId
        ? {
            service: "Maritime",
            redirectTo: `/verify/boat/${sticker.assignedBoatId}`,
          }
        : null;
    },
  },

  // ── Scanned straight onto a vehicle record (stickerNumber column) ──
  {
    key: "mass-transit",
    async resolve(m) {
      const v = await db.vehicle.findFirst({
        where: {
          removedAt: null,
          OR: stickerFilters(m).map((f) => ({ stickerNumber: f })),
        },
        select: { id: true },
      });
      return v
        ? { service: "Mass Transit", redirectTo: `/verify/vehicle/${v.id}` }
        : null;
    },
  },
  {
    key: "towing-van",
    async resolve(m) {
      const v = await db.towingVan.findFirst({
        where: { OR: stickerFilters(m).map((f) => ({ stickerNumber: f })) },
        select: {
          plateNumber: true,
          vehicleType: true,
          make: true,
          model: true,
          operatorName: true,
          permitNumber: true,
          permitIssuedAt: true,
        },
      });
      if (!v) return null;
      const authorised = !!v.permitNumber;
      return {
        service: "Towing Van",
        summary: {
          service: "Towing Van",
          title: v.plateNumber,
          authorised,
          statusLabel: authorised ? "Permit issued" : "No permit issued",
          facts: [
            { label: "Vehicle type", value: v.vehicleType },
            { label: "Make / model", value: [v.make, v.model].filter(Boolean).join(" ") },
            { label: "Operator", value: v.operatorName },
            { label: "Permit number", value: v.permitNumber },
            { label: "Permit issued", value: v.permitIssuedAt?.toLocaleDateString("en-GB") },
          ],
        },
      };
    },
  },
  {
    key: "logistics",
    async resolve(m) {
      const v = await db.logisticsVehicle.findFirst({
        where: { OR: stickerFilters(m).map((f) => ({ stickerNumber: f })) },
        select: {
          plateNumber: true,
          vehicleType: true,
          make: true,
          model: true,
          applicant: {
            select: {
              applicantType: true,
              companyName: true,
              contactPerson: true,
              permitNumber: true,
              permitIssuedAt: true,
            },
          },
        },
      });
      if (!v) return null;
      const a = v.applicant;
      const authorised = !!a.permitNumber;
      return {
        service: "Logistics",
        summary: {
          service: "Logistics",
          title: v.plateNumber,
          authorised,
          statusLabel: authorised ? "Authorised" : "Awaiting approval",
          facts: [
            { label: "Vehicle type", value: v.vehicleType },
            { label: "Make / model", value: [v.make, v.model].filter(Boolean).join(" ") },
            {
              label: a.applicantType === "COMPANY" ? "Company" : "Operator",
              value: a.companyName ?? a.contactPerson,
            },
            { label: "Permit number", value: a.permitNumber },
            { label: "Permit issued", value: a.permitIssuedAt?.toLocaleDateString("en-GB") },
          ],
        },
      };
    },
  },
  {
    key: "commercial-vehicles",
    async resolve(m) {
      const v = await db.cvrVehicle.findFirst({
        where: { OR: stickerFilters(m).map((f) => ({ stickerNumber: f })) },
        select: {
          plateNumber: true,
          category: true,
          vehicleType: true,
          make: true,
          model: true,
          vin: true,
        },
      });
      if (!v) return null;
      const authorised = !!v.vin;
      return {
        service: "Commercial Vehicle",
        summary: {
          service: "Commercial Vehicle",
          title: v.plateNumber,
          authorised,
          statusLabel: authorised ? "Identified" : "Pending identification",
          facts: [
            { label: "Category", value: v.category },
            { label: "Vehicle type", value: v.vehicleType },
            { label: "Make / model", value: [v.make, v.model].filter(Boolean).join(" ") },
            { label: "VIN", value: v.vin },
          ],
        },
      };
    },
  },
];

/** Resolve a scanned value against every registered source. */
export async function resolveSticker(raw: string): Promise<StickerHit | null> {
  const match = buildStickerMatch(raw);
  if (!match.code) return null;

  for (const source of STICKER_SOURCES) {
    const hit = await source.resolve(match);
    if (hit) return hit;
  }
  return null;
}
