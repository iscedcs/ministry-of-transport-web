import { db } from "@/lib/db";
import { toAlphanumericPlate } from "@/lib/plate-validation";

/**
 * TRACAS embargo pool — the lookup every registration path goes through.
 * Kept out of the server-action files so onboarding, plate changes and the
 * live check on the form all ask the same question the same way.
 */

/** The shape plates are matched on: letters and digits only, upper case. */
export function embargoKey(plate: string): string {
  return toAlphanumericPlate(plate);
}

/** The plate as shown: upper case, no spaces ("grs 4246 hg" -> "GRS4246HG"). */
export function embargoDisplay(plate: string): string {
  return (plate ?? "").replace(/\s+/g, "").toUpperCase();
}

export interface ActiveEmbargo {
  id: string;
  plateNumber: string;
  reason: string;
  locationFound: string;
  sanction: string | null;
  placedAt: Date;
}

/** The active embargo on this plate, or null if it is clear. */
export async function findActiveEmbargo(
  plate: string,
): Promise<ActiveEmbargo | null> {
  const key = embargoKey(plate);
  if (!key) return null;
  return db.tracasEmbargo.findUnique({
    where: { activeKey: key },
    select: {
      id: true,
      plateNumber: true,
      reason: true,
      locationFound: true,
      sanction: true,
      placedAt: true,
    },
  });
}

/**
 * The message an enumerator sees when they try to register an embargoed
 * vehicle: why it is embargoed and where it was found, so they can tell the
 * owner exactly what has to be cleared first.
 */
export function embargoBlockMessage(e: ActiveEmbargo): string {
  const placed = e.placedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return [
    `EMBARGO: ${e.plateNumber} is in the embargo pool (since ${placed}) and cannot be registered.`,
    `Reason: ${e.reason}`,
    `Found at: ${e.locationFound}`,
    e.sanction ? `Sanction required: ${e.sanction}` : null,
    `Only the System Admin, Admin or TRACAS MD can lift it; registration can continue after that.`,
  ]
    .filter(Boolean)
    .join(" ");
}
