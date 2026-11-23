/**
 * TRACAS fleet classification — turning what is stored on a vehicle into the
 * groups the TRACAS MD asks about.
 *
 * FT / LV
 *   The fleet number's prefix is the answer ("FT001" is state fleet, "LV097"
 *   is private). It is the label printed on the vehicle, so it is what people
 *   are counting.
 *
 * Vehicle kind (Sienna, Shuttle, Bus, ...)
 *   `TracasVehicle.category` is NOT a clean code. The onboarding form stores
 *   the chosen code (BUS, SHUTTLE_BUS ...) — unless the enumerator typed a
 *   sub-category, in which case that free text is stored instead — and the
 *   imported records carry whatever the vendor typed: "7 SEATER/ SIENNA",
 *   "TOYOTA SIENNA", "7 SEATERS / SHUTTLE  BUS", "HIJET/TRUCK" ... dozens of
 *   spellings of a handful of things. So the kind is read from the text
 *   (category plus make/model), by keyword, not by exact match.
 *
 *   Anything the rules cannot place lands in OTHER, and the breakdown page
 *   lists those raw values so a new rule can be added here when a pattern
 *   shows up. Nothing in the database is rewritten.
 */

export type FleetType = "FT" | "LV" | "OTHER";

export const FLEET_TYPE_LABELS: Record<FleetType, string> = {
  FT: "State fleet (FT)",
  LV: "Private / licensed (LV)",
  OTHER: "Other numbering",
};

export function fleetTypeOf(fleetNumber: string | null | undefined): FleetType {
  const p = /^[A-Za-z]+/.exec((fleetNumber ?? "").trim())?.[0]?.toUpperCase();
  return p === "FT" ? "FT" : p === "LV" ? "LV" : "OTHER";
}

export type VehicleKind =
  | "SIENNA"
  | "SHUTTLE"
  | "BUS"
  | "MINIBUS"
  | "TRUCK"
  | "OTHER";

/** Display order for the breakdown. */
export const VEHICLE_KINDS: { key: VehicleKind; label: string }[] = [
  { key: "SIENNA", label: "Sienna / MPV" },
  { key: "SHUTTLE", label: "Shuttle" },
  { key: "BUS", label: "Bus" },
  { key: "MINIBUS", label: "Minibus" },
  { key: "TRUCK", label: "Truck / pick-up" },
  { key: "OTHER", label: "Other / unclassified" },
];

/**
 * First match wins, so order matters: "SHUTTLE BUS" must be a shuttle, not a
 * bus; "HIJET TRUCK" a truck, not a shuttle; "MINI BUS" a minibus, not a bus.
 */
const RULES: { kind: VehicleKind; test: RegExp }[] = [
  { kind: "TRUCK", test: /TRUCK|PICK[\s-]?UP|LORRY|TIPPER/ },
  { kind: "SIENNA", test: /SIENNA|SEINNA|SIENA|SEINA|\bMPV\b|PEUGEOT\s*807/ },
  { kind: "MINIBUS", test: /MINI[\s-]?BUS/ },
  { kind: "SHUTTLE", test: /SHUTTLE|HIJET|HIJEY|HINET|ATRAI|CLIPPER|\bEVERY\b/ },
  {
    kind: "BUS",
    // "BUS", Coaster, Hiace, Nissan Urban, or a 12+ seater (typos included:
    // "14 SETAER").
    test: /\bBUS\b|COASTER|HIACE|URBAN|\b(1[2-9]|[2-9]\d)\s*-?\s*SE/,
  },
];

/** What kind of vehicle this is, from its stored category and make/model. */
export function vehicleKindOf(
  category: string | null | undefined,
  makeModel?: string | null,
): VehicleKind {
  // Category first: it is what the enumerator or vendor chose to call it. Only
  // when it says nothing useful does the make/model get a say.
  const fromCategory = classify(category);
  if (fromCategory !== "OTHER") return fromCategory;
  return classify(makeModel);
}

function classify(text: string | null | undefined): VehicleKind {
  const t = (text ?? "").toUpperCase();
  if (!t.trim()) return "OTHER";
  return RULES.find((r) => r.test.test(t))?.kind ?? "OTHER";
}
