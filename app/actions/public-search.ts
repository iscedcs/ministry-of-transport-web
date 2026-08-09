"use server";

/**
 * Unified public verification search.
 *
 * One entry point for the public portal. The caller types anything — a plate,
 * a fleet number, an authority reference, a sticker code, an ANSSID, or a park
 * name — and this works out what it is and which register it belongs to.
 *
 * TWO RULES GOVERN WHAT THIS RETURNS:
 *
 * 1. Identifiers match EXACTLY. Partial matching on a plate would let anyone
 *    trawl the register a character at a time. Only free-text names (motor
 *    parks, transit companies) use `contains`, because those are public
 *    directory information by design.
 *
 * 2. The payload is a VERIFICATION payload, not a record dump. It answers
 *    "is this legitimately operating, and is its authority current?" — and
 *    deliberately omits engine numbers, chassis/VIN, owner phone, owner NIN
 *    and driver phone. Those identify a vehicle well enough to clone it, or
 *    a person well enough to impersonate a call from the Ministry.
 */

import { db } from "@/lib/db";

// ── Identifier shapes ───────────────────────────────────────────────────────

const AUTHORITY_REF = /^TRAC-\d+-AN$/i;
const FLEET_NUMBER = /^(LV|FT)\d{1,4}$/i;
const STICKER_CODE = /^status\d+$/i;
const DIGITS_ONLY = /^\d{4,16}$/;
/** Nigerian plates: letters and digits, no separators once normalised. */
const PLATE_LIKE = /^[A-Z0-9]{5,12}$/i;

export type PublicSearchKind =
  | "MOTOR_PARK"
  | "TRACAS_VEHICLE"
  | "TRANSIT_VEHICLE"
  | "BOAT";

export interface PublicSearchResult {
  kind: PublicSearchKind;
  id: string;
  /** Primary line — plate, park name, boat name. */
  title: string;
  /** Secondary line — operator, fleet number, category. */
  subtitle: string;
  /** Where the public detail view lives. */
  href: string;
  /** Verification state, e.g. "Authorised", "Expired". */
  status: string;
  statusTone: "good" | "warn" | "bad" | "neutral";
  /** Short label/value pairs safe to show in a results card. */
  facts: { label: string; value: string }[];
}

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Strip spaces/dashes so "NSH 266 YJ" matches "NSH266YJ". */
const normalisePlate = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();

export async function publicSearch(rawQuery: string): Promise<{
  success: boolean;
  data?: PublicSearchResult[];
  error?: string;
  /** What the system decided the query was, for the UI to explain itself. */
  interpreted?: string;
}> {
  const query = (rawQuery ?? "").trim();
  if (!query) return { success: true, data: [], interpreted: undefined };
  if (query.length < 3) {
    return { success: true, data: [], interpreted: "Enter at least 3 characters" };
  }

  const plate = normalisePlate(query);

  try {
    const results: PublicSearchResult[] = [];
    let interpreted: string | undefined;

    // ── TRACAS vehicles ──────────────────────────────────────────────────
    // Matched by plate, fleet number, authority ref or bound sticker code —
    // all exact.
    const tracas = await db.tracasVehicle.findMany({
      where: {
        OR: [
          { registrationNumber: { equals: plate, mode: "insensitive" } },
          { fleetNumber: { equals: plate, mode: "insensitive" } },
          { authorityRef: { equals: query, mode: "insensitive" } },
          { sticker: { stickerCode: { equals: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        registrationNumber: true,
        fleetNumber: true,
        category: true,
        capacity: true,
        ownershipType: true,
        status: true,
        letterStatus: true,
        authorityRef: true,
        particularsExpiryDate: true,
        assignedRoute: true,
        assignedDriver: { select: { fullName: true } },
      },
      take: 5,
    });

    for (const v of tracas) {
      const authorised = v.letterStatus === "APPROVED" && v.status === "ACTIVE";
      const expired =
        !!v.particularsExpiryDate && new Date(v.particularsExpiryDate) < new Date();

      results.push({
        kind: "TRACAS_VEHICLE",
        id: v.id,
        title: v.registrationNumber,
        subtitle: `TRACAS · Fleet ${v.fleetNumber}`,
        href: `/verify/tracas/${encodeURIComponent(v.authorityRef)}`,
        status: !authorised
          ? "Not authorised"
          : expired
            ? "Particulars expired"
            : "Authorised",
        statusTone: !authorised ? "bad" : expired ? "warn" : "good",
        facts: [
          { label: "Operator", value: "Transport Company of Anambra State" },
          { label: "Category", value: v.category },
          ...(v.capacity ? [{ label: "Capacity", value: `${v.capacity} seats` }] : []),
          {
            label: "Ownership",
            value:
              v.ownershipType === "GOVERNMENT_OWNED"
                ? "State fleet"
                : v.ownershipType === "INDIVIDUAL"
                  ? "Private owner"
                  : "Franchise",
          },
          ...(v.assignedRoute ? [{ label: "Route", value: v.assignedRoute }] : []),
          ...(v.assignedDriver
            ? [{ label: "Driver", value: v.assignedDriver.fullName }]
            : []),
          { label: "Valid until", value: fmt(v.particularsExpiryDate) },
        ],
      });
    }
    if (tracas.length) interpreted = "TRACAS vehicle";

    // ── Mass transit fleet vehicles ──────────────────────────────────────
    const transit = await db.vehicle.findMany({
      where: { registrationNumber: { equals: plate, mode: "insensitive" } },
      select: {
        id: true,
        registrationNumber: true,
        vehicleType: true,
        make: true,
        model: true,
        status: true,
        routesServed: true,
        roadworthinessExpiry: true,
        company: {
          select: {
            companyName: true,
            permitStatus: true,
            permitNumber: true,
            permitExpiresAt: true,
          },
        },
      },
      take: 5,
    });

    for (const v of transit) {
      const companyLicensed = v.company?.permitStatus === "ACTIVE";
      const vehicleActive = v.status === "ACTIVE";

      results.push({
        kind: "TRANSIT_VEHICLE",
        id: v.id,
        title: v.registrationNumber,
        subtitle: `Mass Transit · ${v.company?.companyName ?? "Unknown operator"}`,
        href: `/verify/vehicle/${v.id}`,
        status: !companyLicensed
          ? "Operator not licensed"
          : !vehicleActive
            ? `Vehicle ${v.status.toLowerCase()}`
            : "Authorised",
        statusTone: !companyLicensed ? "bad" : !vehicleActive ? "warn" : "good",
        facts: [
          { label: "Operator", value: v.company?.companyName ?? "—" },
          { label: "Type", value: v.vehicleType },
          { label: "Make & model", value: [v.make, v.model].filter(Boolean).join(" ") },
          ...(v.routesServed ? [{ label: "Routes", value: v.routesServed }] : []),
          {
            label: "Operator permit",
            value: v.company?.permitNumber ?? "Not issued",
          },
          { label: "Permit expires", value: fmt(v.company?.permitExpiresAt) },
        ],
      });
    }
    if (transit.length) interpreted = interpreted ?? "Mass transit vehicle";

    // ── Boats ────────────────────────────────────────────────────────────
    const boats = await db.boat.findMany({
      where: {
        OR: [
          { registrationNumber: { equals: plate, mode: "insensitive" } },
          { securityCode: { equals: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        boatType: true,
        capacity: true,
        status: true,
        assignedRider: { select: { fullName: true } },
      },
      take: 5,
    });

    for (const b of boats) {
      results.push({
        kind: "BOAT",
        id: b.id,
        title: b.registrationNumber,
        subtitle: `Maritime · ${b.name}`,
        href: `/verify/boat/${b.id}`,
        status: b.status === "ACTIVE" ? "Authorised" : `Permit ${b.status.toLowerCase()}`,
        statusTone: b.status === "ACTIVE" ? "good" : "bad",
        facts: [
          { label: "Vessel", value: b.name },
          { label: "Type", value: b.boatType },
          ...(b.capacity ? [{ label: "Capacity", value: `${b.capacity}` }] : []),
          ...(b.assignedRider
            ? [{ label: "Operator", value: b.assignedRider.fullName }]
            : []),
        ],
      });
    }
    if (boats.length) interpreted = interpreted ?? "Registered boat";

    // ── Motor parks ──────────────────────────────────────────────────────
    // Names are directory information, so partial matching is appropriate
    // here in a way it is not for plates.
    const isIdentifier =
      AUTHORITY_REF.test(query) ||
      FLEET_NUMBER.test(query) ||
      STICKER_CODE.test(query);

    if (!isIdentifier) {
      const parks = await db.motorPark.findMany({
        where: {
          applicationStatus: { in: ["APPROVED", "TEMPORAL_APPROVAL"] },
          OR: [
            { businessName: { contains: query, mode: "insensitive" } },
            { transportCompanyName: { contains: query, mode: "insensitive" } },
            ...(DIGITS_ONLY.test(query)
              ? [
                  { anssidNumber: { equals: query } },
                  { permitNumber: { equals: query } },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          businessName: true,
          transportCompanyName: true,
          townCity: true,
          lga: true,
          permitNumber: true,
          permitStatus: true,
          applicationStatus: true,
          permitExpiresAt: true,
        },
        take: 10,
      });

      for (const p of parks) {
        const active =
          p.permitStatus === "ACTIVE" || p.applicationStatus === "APPROVED";
        results.push({
          kind: "MOTOR_PARK",
          id: p.id,
          title: p.businessName,
          subtitle: `Motor Park · ${p.townCity}, ${p.lga}`,
          href: `/verify/park/${p.id}`,
          status:
            p.applicationStatus === "TEMPORAL_APPROVAL"
              ? "Temporary approval"
              : active
                ? "Approved"
                : "Not active",
          statusTone:
            p.applicationStatus === "TEMPORAL_APPROVAL"
              ? "warn"
              : active
                ? "good"
                : "bad",
          facts: [
            ...(p.transportCompanyName
              ? [{ label: "Operator", value: p.transportCompanyName }]
              : []),
            { label: "Location", value: `${p.townCity}, ${p.lga}` },
            { label: "Permit", value: p.permitNumber ?? "Not issued" },
            { label: "Expires", value: fmt(p.permitExpiresAt) },
          ],
        });
      }
      if (parks.length) interpreted = interpreted ?? "Motor park";
    }

    if (!interpreted && PLATE_LIKE.test(plate)) {
      interpreted = "Plate number";
    }

    return { success: true, data: results, interpreted };
  } catch (error) {
    console.error("publicSearch failed:", error);
    return { success: false, error: "Search failed. Please try again." };
  }
}
