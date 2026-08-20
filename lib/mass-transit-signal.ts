/**
 * Why an imported record looks like a mass transit operator.
 *
 * The vendor captured no operator category, so this is a hint for the officer
 * making the call — never the decision itself. It reads the three things the
 * export does carry: ownership type, the operator's own name, and the service
 * types they declared.
 */
export function massTransitSignal(app: {
  ownershipType?: string | null;
  ownerName?: string | null;
  parkName?: string | null;
  serviceTypes?: unknown;
}): string | null {
  const reasons: string[] = [];

  const name = `${app.ownerName ?? ""} ${app.parkName ?? ""}`;
  if (/\b(ltd|limited|plc|motors|transport|lines?|express)\b/i.test(name)) {
    reasons.push("company name");
  }

  if (/registered company|^company$/i.test(app.ownershipType ?? "")) {
    reasons.push("registered company");
  }

  const services = Array.isArray(app.serviceTypes)
    ? (app.serviceTypes as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    : [];
  const fleet = services.filter((s) =>
    /inter-state|luxury bus|buses|cargo|logistics/i.test(s),
  );
  if (fleet.length > 0) reasons.push(fleet.join(", ").toLowerCase());

  // One weak signal on its own is noise; two or more is worth surfacing.
  return reasons.length >= 2 ? reasons.join(", ") : null;
}
