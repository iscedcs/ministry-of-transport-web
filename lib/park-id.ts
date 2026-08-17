/**
 * Park identifiers.
 *
 * Every segment means something, which is what the Ministry asked for:
 *
 *   ANS  Anambra State
 *   MOT  Ministry of Transport
 *   PK   Park
 *
 * A Park ID is assigned once, on first approval, and never reissued — it
 * identifies the park itself, not the certificate currently in force, so it
 * survives revalidation. Shared between the revalidation chain and the mass
 * transit chain so terminals and motor parks draw from one sequence.
 */

import { db } from "@/lib/db";

export const PARK_ID_PREFIX = "ANS-MOT-PK";

/** The next free Park ID, e.g. ANS-MOT-PK-000125. */
export async function nextParkId(): Promise<string> {
  const last = await db.motorPark.findFirst({
    where: { parkId: { startsWith: PARK_ID_PREFIX } },
    orderBy: { parkId: "desc" },
    select: { parkId: true },
  });
  const n = last?.parkId ? Number(last.parkId.split("-").pop()) : 0;
  return format((Number.isFinite(n) ? n : 0) + 1);
}

/**
 * A run of consecutive Park IDs, for approving several terminals at once.
 * Taking them in one go avoids each call reading the same "last" row and
 * handing out the same number twice.
 */
export async function nextParkIds(count: number): Promise<string[]> {
  const last = await db.motorPark.findFirst({
    where: { parkId: { startsWith: PARK_ID_PREFIX } },
    orderBy: { parkId: "desc" },
    select: { parkId: true },
  });
  const start = last?.parkId ? Number(last.parkId.split("-").pop()) : 0;
  const base = Number.isFinite(start) ? start : 0;
  return Array.from({ length: count }, (_, i) => format(base + i + 1));
}

const format = (n: number) => `${PARK_ID_PREFIX}-${String(n).padStart(6, "0")}`;

/** 1 -> "ONE". Used for "ABC LIMITED MOTORS TERMINAL ONE". */
const WORDS = [
  "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT",
  "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN",
  "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN", "TWENTY",
];

export function terminalOrdinal(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "ABC LIMITED MOTORS TERMINAL ONE" — the certificate's TYPE OF PARK line. */
export function terminalDesignation(companyName: string, n: number): string {
  return `${companyName.toUpperCase()} TERMINAL ${terminalOrdinal(n)}`;
}
