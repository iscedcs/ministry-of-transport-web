import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../lib/db";

/**
 * One-off migration of the previous vendor's motor park register.
 *
 * Each surviving record becomes:
 *   • a User (the park owner) — reused when one owner holds several parks
 *   • a RevalidationApplication at SUBMITTED, tagged dataSource=VENDOR_IMPORT
 *
 * The applications then run the Ministry's own chain — HOD schedules the
 * inspection, PS clears it, the inspector attends, HOD and PS recommend, and
 * the Commissioner approves. Only then is a revalidation certificate issued
 * with OUR number. The vendor's form serial is kept for reference only.
 *
 * Sections F and H were not in the vendor's export. Rather than invent
 * answers, those columns are left null and listed in `incompleteSections`, so
 * the owner is prompted to complete them and the inspector sees "Not stated"
 * instead of a fabricated "No".
 *
 * Runs as a DRY RUN by default. Pass --apply to write.
 *
 *   npx tsx scripts/import-vendor-parks.ts
 *   npx tsx scripts/import-vendor-parks.ts --apply
 */

const APPLY = process.argv.includes("--apply");
const SOURCE = path.join(process.cwd(), "app", "api", "allmotorparks.json");

// ── Vendor record shape ─────────────────────────────────────────────────────

interface VendorBranch {
  lga?: string;
  name?: string;
}

interface VendorPark {
  id?: string;
  username?: string;
  formSerialNumber?: string;
  asinNumber?: string;
  asin?: string;
  dateOfApplication?: string;
  ownerName?: string;
  ownershipType?: string;
  cacRegistrationNumber?: string;
  designation?: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  emailAddress?: string;
  residentialAddress?: string;
  nin?: string;
  tin?: string;
  motorParkName?: string;
  facilityType?: string;
  serviceTypes?: string[];
  physicalLocation?: string;
  townCommunity?: string;
  lga?: string;
  routes?: string[];
  yearEstablished?: string;
  operationalStatus?: string;
  vehiclesPerDay?: string;
  totalVehiclesPerDay?: string;
  vehicleTypes?: string[];
  globalVehicleTypes?: string[];
  securityArrangement?: string[];
  managementStaff?: string;
  administrativeStaff?: string;
  securityPersonnel?: string;
  othersStaff?: string;
  branches?: VendorBranch[];
  [k: string]: unknown;
}

// ── Reference data ──────────────────────────────────────────────────────────

/**
 * The vendor sent park-level LGA as a bare numeric code with no key. Their
 * BRANCH rows carry the LGA name, so each record's own branch is the primary
 * source; this table is the fallback, reconstructed from that same overlap.
 */
const LGA_CODES: Record<string, string> = {
  "1": "Aguata",
  "2": "Awka North",
  "3": "Awka South",
  "4": "Anambra East",
  "5": "Anambra West",
  "6": "Anaocha",
  "10": "Idemili North",
  "11": "Idemili South",
  "12": "Ihiala",
  "13": "Njikoka",
  "14": "Nnewi North",
  "16": "Orumba North",
  "17": "Orumba South",
  "18": "Oyi",
  "19": "Ogbaru",
  "20": "Onitsha South",
  "21": "Onitsha North",
};

/** Vendor Yes/No column → the facility label our checklist expects. */
const FACILITY_MAP: [keyof VendorPark, string][] = [
  ["perimeterFence", "Perimeter Fence"],
  ["securityPost", "Security Post"],
  ["toiletFacilities", "Toilet Facilities"],
  ["boreholeWater", "Borehole/Water Supply"],
  ["passengerWaitingArea", "Passenger Waiting Area"],
  ["fireExtinguishers", "Fire Extinguishers"],
  ["cctvCameras", "CCTV Cameras"],
  ["solarStreetLights", "Solar/Street Lights"],
  ["ticketingPoint", "Ticketing Point"],
  ["managerAdminOffice", "Manager/Admin Office"],
];

/** Our form offers three; the vendor also used "Motor Park", which we drop. */
const FACILITY_TYPES = new Set(["Private", "Public", "Loading Bay"]);

// ── Helpers ─────────────────────────────────────────────────────────────────

const txt = (v: unknown): string => String(v ?? "").trim().replace(/\s+/g, " ");
const isYes = (v: unknown) => txt(v).toLowerCase() === "yes";
const digits = (v: unknown) => txt(v).replace(/\D/g, "");

/** Nigerian mobile, as we store it: 11 digits beginning 0. */
function cleanPhone(raw: unknown): string | null {
  let v = txt(raw).replace(/[\s-]/g, "");
  if (/^\+234\d{10}$/.test(v)) v = "0" + v.slice(4);
  else if (/^234\d{10}$/.test(v)) v = "0" + v.slice(3);
  return /^0\d{10}$/.test(v) ? v : null;
}

/** An address without "@" cannot be corrected safely — we drop it. */
function cleanEmail(raw: unknown): string | null {
  const v = txt(raw).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null;
}

/** Branch name first, then the reconstructed code table. */
function resolveLga(p: VendorPark): string | null {
  for (const b of p.branches ?? []) {
    const n = txt(b?.lga);
    if (n && !/^\d+$/.test(n)) return n;
  }
  return LGA_CODES[txt(p.lga)] ?? null;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "Park", lastName: "Owner" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// ── Filtering ───────────────────────────────────────────────────────────────

type Reject = { park: string; reason: string };

/**
 * Three separate concerns — the ABC Transport triplicate, the ASIN123456 test
 * entries, and the Lagos addresses — turned out to be the same three rows, so
 * one rule covers all of them.
 *
 * Note we deliberately do NOT de-duplicate on formSerialNumber: the vendor
 * truncates it to a four-character name prefix, so "ASI-MOT-RVF-2026/CHIE" is
 * shared by twelve unrelated parks. Doing so would discard 38 real records.
 */
function reject(p: VendorPark): string | null {
  if (txt(p.asin) === "ASIN123456") {
    return "test entry (ASIN123456 / Lagos / ABC Transport duplicate)";
  }
  const asin = txt(p.asinNumber);
  if (!/^\d{6,16}$/.test(asin)) {
    return `ASIN outside 6-16 digits: "${asin}"`;
  }
  return null;
}

// ── Import ──────────────────────────────────────────────────────────────────

async function main() {
  const raw = JSON.parse(readFileSync(SOURCE, "utf-8")) as { data: VendorPark[] };
  const all = raw.data ?? [];

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${all.length} vendor records\n`);

  const rejected: Reject[] = [];
  const parks = all.filter((p) => {
    const why = reject(p);
    if (why) rejected.push({ park: txt(p.motorParkName) || txt(p.id), reason: why });
    return !why;
  });

  const stats = {
    usersCreated: 0,
    usersReused: 0,
    ownersWithoutContact: 0,
    appsCreated: 0,
    skippedExisting: 0,
    phonesDropped: 0,
    emailsDropped: 0,
    lgaUnresolved: 0,
    failed: 0,
  };

  for (const p of parks) {
    const legacyId = txt(p.id);
    const parkName = txt(p.motorParkName) || txt(p.ownerName) || "Unnamed Park";

    try {
      // Re-running the script must not duplicate what it already imported.
      // Skipped on a dry run so the report can be produced before the schema
      // migration has been applied.
      if (APPLY) {
        const already = await db.revalidationApplication.findFirst({
          where: { dataSource: "VENDOR_IMPORT", legacyRecordId: legacyId },
          select: { id: true },
        });
        if (already) {
          stats.skippedExisting++;
          continue;
        }
      }

      const email = cleanEmail(p.emailAddress);
      if (!email && txt(p.emailAddress)) stats.emailsDropped++;

      // Fall back to the alternate line when the primary is unusable — it
      // rescues three owners who would otherwise have no way to sign in.
      const phone = cleanPhone(p.phoneNumber) ?? cleanPhone(p.alternatePhoneNumber);
      if (!phone && txt(p.phoneNumber)) stats.phonesDropped++;

      const asin = digits(p.asinNumber);
      const lga = resolveLga(p);
      if (!lga) stats.lgaUnresolved++;

      // ── Owner account ────────────────────────────────────────────────────
      // One owner may hold several parks, so match before creating. ASIN is
      // the strongest key; email and phone follow.
      let userId: string | null = null;

      if (APPLY) {
        const existing = await db.user.findFirst({
          where: {
            OR: [
              { asinNumber: asin },
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : []),
            ],
          },
          select: { id: true },
        });

        if (existing) {
          userId = existing.id;
          stats.usersReused++;
        } else if (email || phone) {
          const { firstName, lastName } = splitName(txt(p.ownerName) || parkName);
          const user = await db.user.create({
            data: {
              email,
              phone,
              asinNumber: asin,
              firstName,
              lastName,
              role: "EXTERNAL_APPLICANT",
              registeredService: "MOTOR_PARK",
              residentialAddress: txt(p.residentialAddress) || null,
            },
            select: { id: true },
          });
          userId = user.id;
          stats.usersCreated++;
        } else {
          // No email and no usable phone — the record is still imported so the
          // park is on the register, but the Ministry must collect contacts
          // before the owner can sign in.
          stats.ownersWithoutContact++;
        }
      }

      // ── Facilities (Section E) ───────────────────────────────────────────
      const facilities = FACILITY_MAP.filter(([k]) => isYes(p[k])).map(([, l]) => l);

      // ── What the owner still has to supply ───────────────────────────────
      const incomplete: string[] = ["F", "H"];
      if (!txt(p.residentialAddress) || !txt(p.designation)) incomplete.push("A");
      if (!txt(p.nin)) incomplete.push("B");
      if (!lga || !txt(p.physicalLocation)) incomplete.push("C");
      if (!txt(p.yearEstablished)) incomplete.push("D");

      const facilityType = FACILITY_TYPES.has(txt(p.facilityType))
        ? txt(p.facilityType)
        : null;

      const appliedAt = txt(p.dateOfApplication)
        ? new Date(txt(p.dateOfApplication))
        : new Date();

      if (APPLY) {
        await db.revalidationApplication.create({
          data: {
            // Section A
            ownerName: txt(p.ownerName) || parkName,
            ownershipType: txt(p.ownershipType) || null,
            cacRegistrationNumber: txt(p.cacRegistrationNumber) || null,
            representativeName: null,
            designation: txt(p.designation) || null,
            phoneNumber: phone,
            alternatePhoneNumber: cleanPhone(p.alternatePhoneNumber),
            emailAddress: email,
            residentialAddress: txt(p.residentialAddress) || null,

            // Section B
            asinNumber: asin,
            nin: digits(p.nin) || null,
            tin: txt(p.tin) || null,

            // Section C
            parkName,
            facilityType,
            physicalLocation: txt(p.physicalLocation) || null,
            townCommunity: txt(p.townCommunity) || null,
            lga,

            // Section D
            yearEstablished: txt(p.yearEstablished) || null,
            operationalStatus: txt(p.operationalStatus) || null,
            dailyVehiclesCount:
              txt(p.totalVehiclesPerDay) || txt(p.vehiclesPerDay) || null,
            vehicleTypes: (p.globalVehicleTypes?.length
              ? p.globalVehicleTypes
              : (p.vehicleTypes ?? [])
            ).join(", "),

            // Section E
            facilitiesAvailable: facilities,

            // Sections F and H are absent from the vendor's export — left null.

            // Section G
            managementStaffCount: Number(digits(p.managementStaff)) || 0,
            adminStaffCount: Number(digits(p.administrativeStaff)) || 0,
            securityStaffCount: Number(digits(p.securityPersonnel)) || 0,
            otherStaffCount: Number(digits(p.othersStaff)) || 0,
            securityArrangement: (p.securityArrangement ?? []).join(", ") || null,

            // Vendor-only fields worth keeping
            serviceTypes: p.serviceTypes ?? [],
            routes: p.routes ?? [],

            // Provenance
            dataSource: "VENDOR_IMPORT",
            legacyRecordId: legacyId,
            legacyFormSerial: txt(p.formSerialNumber) || null,
            legacyCapturedBy: txt(p.username) || null,
            importedAt: new Date(),
            incompleteSections: incomplete,

            applicantUserId: userId,
            status: "SUBMITTED",
            createdAt: isNaN(appliedAt.getTime()) ? new Date() : appliedAt,
          },
        });
      }

      stats.appsCreated++;
    } catch (err) {
      stats.failed++;
      console.error(`  FAILED  ${parkName} (${legacyId}):`, (err as Error).message);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log("REJECTED");
  for (const r of rejected) console.log(`  - ${r.park} — ${r.reason}`);

  console.log("\nSUMMARY");
  console.log(`  vendor records         ${all.length}`);
  console.log(`  rejected               ${rejected.length}`);
  console.log(`  already imported       ${stats.skippedExisting}`);
  console.log(`  applications created   ${stats.appsCreated}`);
  console.log(`  owner accounts created ${stats.usersCreated}`);
  console.log(`  owner accounts reused  ${stats.usersReused}`);
  console.log(`  no contact — no login  ${stats.ownersWithoutContact}`);
  console.log(`  phones dropped         ${stats.phonesDropped}`);
  console.log(`  emails dropped         ${stats.emailsDropped}`);
  console.log(`  LGA unresolved         ${stats.lgaUnresolved}`);
  console.log(`  failed                 ${stats.failed}`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to commit.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
