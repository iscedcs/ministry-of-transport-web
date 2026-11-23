import { ANAMBRA_LGAS } from "./consts";

/**
 * Fixed three-letter codes for the 21 Local Government Areas, used in
 * Special Enforcement Unit ID numbers (MOT/AWS/SEU./001).
 *
 * Fixed rather than "first three letters", because that clashes: Awka North
 * and Awka South would both be "Awk", Anambra East / West / Anaocha all "Ana".
 * Codes must never change once a number has been printed with them.
 */
export const LGA_CODES: Record<(typeof ANAMBRA_LGAS)[number], string> = {
  Aguata: "AGU",
  "Anambra East": "ANE",
  "Anambra West": "ANW",
  Anaocha: "ANA",
  "Awka North": "AWN",
  "Awka South": "AWS",
  Ayamelum: "AYA",
  Dunukofia: "DUN",
  Ekwusigo: "EKW",
  "Idemili North": "IDN",
  "Idemili South": "IDS",
  Ihiala: "IHI",
  Njikoka: "NJI",
  "Nnewi North": "NNN",
  "Nnewi South": "NNS",
  Ogbaru: "OGB",
  "Onitsha North": "ONN",
  "Onitsha South": "ONS",
  "Orumba North": "ORN",
  "Orumba South": "ORS",
  Oyi: "OYI",
};

/** True for one of Anambra's 21 LGAs, spelled as in ANAMBRA_LGAS. */
export function isAnambraLga(v: unknown): v is keyof typeof LGA_CODES {
  return typeof v === "string" && Object.hasOwn(LGA_CODES, v);
}

/**
 * Match free text ("awka south", " Awka South ") to the canonical LGA name,
 * or null. The applicant's own LGA is typed by hand, so it can be spelled any
 * way; this is how we recover a real LGA from it when we have to.
 */
export function canonicalLga(v: string | null | undefined): string | null {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return null;
  return ANAMBRA_LGAS.find((l) => l.toLowerCase() === t) ?? null;
}

/** "Awka South" -> "AWS". Unknown names fall back to their first 3 letters. */
export function lgaCode(lga: string | null | undefined): string {
  const canon = canonicalLga(lga);
  if (canon) return LGA_CODES[canon as keyof typeof LGA_CODES];
  const letters = (lga ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "ANS";
}
