/**
 * Park staff security codes.
 *
 * The code printed on the reflective vest reads MOT/Awk/Abb./001 — Ministry,
 * town, an abbreviation of the park, then the staff serial within that park.
 * The generator produced MOT-ISCEDIGITALCON-0001 instead: the whole park name
 * squashed to fifteen characters, no town, and a four-digit serial. The code
 * an officer reads aloud has to be the code on the vest.
 *
 * Codes are assigned once and never regenerated — a staff member's code is
 * printed on a garment, so changing the format must not change existing codes.
 */

/** "Awka South" -> "Awk"; "Onitsha" -> "Oni" */
function townPart(town: string | null | undefined): string {
  const clean = (town ?? "").replace(/[^A-Za-z ]/g, "").trim();
  if (!clean) return "ANS";
  const first = clean.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1, 3).toLowerCase();
}

/**
 * "ISCE Digital Concept" -> "Isc"; "Abba Motor Park" -> "Abb".
 * Words that say nothing about which park this is are dropped first.
 */
const NOISE = new Set([
  "motor",
  "park",
  "parks",
  "limited",
  "ltd",
  "nigeria",
  "company",
  "transport",
  "terminal",
  "loading",
  "bay",
  "the",
  "and",
]);

function parkPart(name: string): string {
  const words = (name ?? "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = words.filter((w) => !NOISE.has(w.toLowerCase()));
  const source = (meaningful.length > 0 ? meaningful : words)[0] ?? "Park";

  return source.charAt(0).toUpperCase() + source.slice(1, 3).toLowerCase();
}

/**
 * MOT/Awk/Isc./001
 *
 * @param parkName    the park's business name
 * @param town        the park's town or city
 * @param serial      the staff member's serial within that park, from 1
 */
export function buildStaffSecurityCode(
  parkName: string,
  town: string | null | undefined,
  serial: number,
): string {
  return `MOT/${townPart(town)}/${parkPart(parkName)}./${String(serial).padStart(3, "0")}`;
}
