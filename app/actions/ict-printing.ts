"use server";

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { PRINTING_PAGE_SIZE } from "@/lib/query-limits";

export interface PrintingItem {
  id: string;
  category:
    | "DRIVER_ID_CARD"
    | "LETTER_OF_AUTHORITY"
    | "PARK_STAFF_ID_CARD"
    | "BOAT_PERMIT"
    | "REVALIDATION_CERTIFICATE"
    | "PARK_CERTIFICATE"
    | "TEMPORAL_APPROVAL"
    | "PARK_STAFF"
    | "MASS_TRANSIT_LETTER";
  title: string;
  subtitle: string;
  refOrCode: string;
  issueDate?: string | Date | null;
  status: string;
  printUrl: string;
  photoUrl?: string | null;
}

/**
 * Who may see the printing queue.
 *
 * ICT_OFFICER is the Ministry printing centre and sees every queue.
 * ICT_OFFICER_TRACAS is dedicated to TRACAS: driver ID cards and letters of
 * authority only. The scoping is applied at query time, not just in the UI,
 * so a TRACAS printer never receives park-monitor or maritime records at all.
 */
const PRINTING_ROLES = [
  "ICT_OFFICER",
  "ICT_OFFICER_TRACAS",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
] as const;

/** Queue scope derived from the viewer's role. */
export type PrintingScope = "ALL" | "TRACAS";

/** Which queue the officer is looking at. */
export type PrintingQueue =
  | "ALL"
  | "DRIVER_ID_CARD"
  | "LETTER_OF_AUTHORITY"
  | "PARK_STAFF_ID_CARD"
  | "BOAT_PERMIT"
  | "REVALIDATION_CERTIFICATE"
  | "PARK_CERTIFICATE"
  | "TEMPORAL_APPROVAL"
  | "PARK_STAFF"
  | "MASS_TRANSIT_LETTER";

/**
 * A printable queue, expressed as something that can be counted and paged.
 *
 * Every queue used to be fetched whole, capped at 100 rows, and then filtered
 * in memory. Three things were wrong with that, and they compounded:
 *
 *   - the badge counted the rows FETCHED, so a queue of 400 reported 100 and
 *     the officer had no way to know the rest existed;
 *   - the cap silently discarded everything past the hundredth record;
 *   - search ran over the fetched array, so a record beyond the cap could not
 *     be found by searching for it either. The item existed, was approved,
 *     and was invisible by every route the officer had.
 *
 * Each source now owns its filter (search included, so it runs in the
 * database over every row), its count, and its page fetch.
 */
interface QueueSource<T> {
  /** Rows that belong in this queue at all, narrowed by the search terms. */
  where: (terms: string[]) => Record<string, unknown>;
  count: (where: Record<string, unknown>) => Promise<number>;
  fetch: (where: Record<string, unknown>, take: number) => Promise<T[]>;
  map: (row: T) => PrintingItem;
}

/**
 * Search by WORD, not by letter, matching the motor parks register.
 *
 * Every word typed must appear somewhere in the record, so "chidi awka" finds
 * Chidi in Awka South rather than every record containing the letter "a". A
 * single character is ignored — it matches nearly every row and would scan the
 * table to return everything — and the count is capped because each word adds
 * another AND clause.
 */
function searchTerms(searchQuery: string): string[] {
  return searchQuery
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

/** AND across words, OR across the columns a word may live in. */
function wordFilter(
  terms: string[],
  columns: (term: string) => Record<string, unknown>[],
): Record<string, unknown> {
  if (terms.length === 0) return {};
  return { AND: terms.map((term) => ({ OR: columns(term) })) };
}

const like = (term: string) => ({
  contains: term,
  mode: "insensitive" as const,
});

// ── The queues ──────────────────────────────────────────────────────────────

/**
 * Only fully-approved cards reach the printing queue: the VIO must have
 * verified, and both the MD and Commissioner must have signed.
 */
const driverSource: QueueSource<{
  id: string;
  fullName: string;
  phoneNumber: string;
  securityCode: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  createdAt: Date;
  status: string;
  operatorAssociation: string | null;
}> = {
  where: (terms) => ({
    idCardStatus: "APPROVED",
    ...wordFilter(terms, (t) => [
      { fullName: like(t) },
      { securityCode: like(t) },
      { licenseNumber: like(t) },
      { phoneNumber: { contains: t } },
      { operatorAssociation: like(t) },
    ]),
  }),
  count: (where) => db.tracasDriver.count({ where }),
  fetch: (where, take) =>
    db.tracasDriver.findMany({
      where,
      take,
      orderBy: { idCommissionerApprovedAt: "desc" },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        securityCode: true,
        licenseNumber: true,
        photoUrl: true,
        createdAt: true,
        status: true,
        operatorAssociation: true,
      },
    }) as never,
  map: (d) => ({
    id: d.id,
    category: "DRIVER_ID_CARD",
    title: d.fullName,
    subtitle: `Commercial Driver (${d.operatorAssociation || "Transport Company Of Anambra State"})`,
    refOrCode: `Code: ${d.securityCode || "N/A"}`,
    issueDate: d.createdAt,
    status: d.status,
    printUrl: `/tracas/driver/${d.id}/id-card`,
    photoUrl: d.photoUrl,
  }),
};

/**
 * Only fully-approved letters reach the printing queue: both the TRACAS MD
 * and the Commissioner must have signed. Anything earlier in the chain is
 * still a draft and must not be printed.
 */
const vehicleSource: QueueSource<{
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  authorityRef: string;
  authorityIssueDate: Date | null;
  createdAt: Date;
  status: string;
  assignedDriver: { fullName: string; photoUrl: string | null } | null;
}> = {
  where: (terms) => ({
    letterStatus: "APPROVED",
    ...wordFilter(terms, (t) => [
      { registrationNumber: like(t) },
      { fleetNumber: like(t) },
      { authorityRef: like(t) },
      { assignedDriver: { fullName: like(t) } },
    ]),
  }),
  count: (where) => db.tracasVehicle.count({ where }),
  fetch: (where, take) =>
    db.tracasVehicle.findMany({
      where,
      take,
      orderBy: { commissionerApprovedAt: "desc" },
      select: {
        id: true,
        registrationNumber: true,
        fleetNumber: true,
        authorityRef: true,
        authorityIssueDate: true,
        createdAt: true,
        status: true,
        assignedDriver: { select: { fullName: true, photoUrl: true } },
      },
    }) as never,
  map: (v) => ({
    id: v.id,
    category: "LETTER_OF_AUTHORITY",
    title: `Vehicle: ${v.registrationNumber} (Fleet: ${v.fleetNumber})`,
    subtitle: `Driver: ${v.assignedDriver?.fullName || "Unassigned"}`,
    refOrCode: `Ref: ${v.authorityRef}`,
    issueDate: v.authorityIssueDate || v.createdAt,
    status: v.status,
    printUrl: `/tracas/${v.id}/letter`,
    photoUrl: v.assignedDriver?.photoUrl,
  }),
};

/**
 * Park monitor badges — the Special Enforcement Unit. Only approved
 * applications with an issued ID card belong in the queue.
 */
const parkMonitorSource: QueueSource<{
  id: string;
  surname: string;
  firstName: string;
  otherNames: string | null;
  lga: string;
  communityTown: string;
  status: string;
  createdAt: Date;
  idCardPhotoUrl: string | null;
}> = {
  where: (terms) => ({
    status: "APPROVED",
    idCardIssued: true,
    ...wordFilter(terms, (t) => [
      { surname: like(t) },
      { firstName: like(t) },
      { otherNames: like(t) },
      { nin: { contains: t } },
      { phoneNumber: { contains: t } },
      { lga: like(t) },
      { communityTown: like(t) },
    ]),
  }),
  count: (where) => db.parkMonitorApplication.count({ where }),
  fetch: (where, take) =>
    db.parkMonitorApplication.findMany({
      where,
      take,
      orderBy: { idCardIssuedAt: "desc" },
      select: {
        id: true,
        surname: true,
        firstName: true,
        otherNames: true,
        lga: true,
        communityTown: true,
        status: true,
        createdAt: true,
        idCardPhotoUrl: true,
      },
    }) as never,
  // The name was previously assembled from firstName and a lastName that does
  // not exist on this model, so every badge in the queue read as a blank name
  // or fell through to "Park Staff Monitor".
  map: (m) => ({
    id: m.id,
    category: "PARK_STAFF_ID_CARD",
    title:
      [m.firstName, m.otherNames, m.surname].filter(Boolean).join(" ").trim() ||
      "Park Staff Monitor",
    subtitle: `Park Monitor · ${[m.communityTown, m.lga].filter(Boolean).join(", ") || "Anambra State"}`,
    refOrCode: `ID: PM-${m.id.slice(0, 6).toUpperCase()}`,
    issueDate: m.createdAt,
    status: m.status,
    printUrl: `/verify/park-staff/${m.id}`,
    photoUrl: m.idCardPhotoUrl,
  }),
};

/** A revoked or suspended boat has no printable permit. */
const boatSource: QueueSource<{
  id: string;
  name: string;
  registrationNumber: string;
  securityCode: string;
  boatType: string;
  status: string;
  createdAt: Date;
  assignedRider: { fullName: string } | null;
}> = {
  where: (terms) => ({
    status: "ACTIVE",
    ...wordFilter(terms, (t) => [
      { name: like(t) },
      { registrationNumber: like(t) },
      { securityCode: like(t) },
      { assignedRider: { fullName: like(t) } },
    ]),
  }),
  count: (where) => db.boat.count({ where }),
  fetch: (where, take) =>
    db.boat.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        securityCode: true,
        boatType: true,
        status: true,
        createdAt: true,
        assignedRider: { select: { fullName: true } },
      },
    }) as never,
  map: (b) => ({
    id: b.id,
    category: "BOAT_PERMIT",
    title: `Boat: ${b.name} (${b.registrationNumber})`,
    subtitle: `Rider: ${b.assignedRider?.fullName || "N/A"} · Type: ${b.boatType}`,
    refOrCode: `Sec Code: ${b.securityCode}`,
    issueDate: b.createdAt,
    status: b.status,
    printUrl: `/verify/boat/${b.id}`,
    photoUrl: null,
  }),
};

/**
 * Park staff ID cards. Distinct from the park MONITOR badges above: monitors
 * are the Special Enforcement Unit, park staff are onboarded to a park.
 */
const parkStaffSource: QueueSource<{
  id: string;
  name: string;
  role: string;
  securityCode: string;
  photoUrl: string | null;
  status: string;
  createdAt: Date;
  motorParkId: string;
  motorPark: { businessName: string };
}> = {
  where: (terms) => ({
    status: "ACTIVE",
    ...wordFilter(terms, (t) => [
      { name: like(t) },
      { securityCode: like(t) },
      { parkSerialNumber: like(t) },
      { role: like(t) },
      { motorPark: { businessName: like(t) } },
    ]),
  }),
  count: (where) => db.parkStaff.count({ where }),
  fetch: (where, take) =>
    db.parkStaff.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        role: true,
        securityCode: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        motorParkId: true,
        motorPark: { select: { businessName: true } },
      },
    }) as never,
  map: (st) => ({
    id: st.id,
    category: "PARK_STAFF",
    title: st.name,
    subtitle: `${st.role} · ${st.motorPark.businessName}`,
    refOrCode: `Code: ${st.securityCode}`,
    issueDate: st.createdAt,
    status: st.status,
    printUrl: `/motor-parks/${st.motorParkId}/staff/${st.id}/id-card`,
    photoUrl: st.photoUrl,
  }),
};

/**
 * Mass transit approval letters. The letter goes to the company; each
 * terminal's certificate reaches the queue through its own park record.
 */
const massTransitSource: QueueSource<{
  id: string;
  companyName: string;
  permitNumber: string | null;
  permitIssuedAt: Date | null;
  applicationStatus: string;
  currentFleetSize: number;
  _count: { terminals: number };
}> = {
  where: (terms) => ({
    applicationStatus: { in: ["APPROVED", "TEMPORAL_APPROVAL"] },
    permitNumber: { not: null },
    ...wordFilter(terms, (t) => [
      { companyName: like(t) },
      { permitNumber: like(t) },
      { asinNumber: like(t) },
      { cacNumber: like(t) },
    ]),
  }),
  count: (where) => db.massTransitCompany.count({ where }),
  fetch: (where, take) =>
    db.massTransitCompany.findMany({
      where,
      take,
      orderBy: { permitIssuedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        permitNumber: true,
        permitIssuedAt: true,
        applicationStatus: true,
        currentFleetSize: true,
        _count: { select: { terminals: true } },
      },
    }) as never,
  map: (c) => ({
    id: c.id,
    category: "MASS_TRANSIT_LETTER",
    title: c.companyName,
    subtitle: `${c.applicationStatus === "TEMPORAL_APPROVAL" ? "Temporary" : "Full"} approval · ${c._count.terminals} terminal(s) · ${c.currentFleetSize} vehicle(s)`,
    refOrCode: `Permit: ${c.permitNumber ?? "N/A"}`,
    issueDate: c.permitIssuedAt,
    status: c.applicationStatus,
    printUrl: `/fleet-operators/${c.id}/approval-letter`,
    photoUrl: null,
  }),
};

/**
 * Approved revalidations. Issued once the Commissioner signs, so the letter
 * carries a signature. Two printables come from each: the letter conveying
 * the decision, and the certificate the park displays.
 */
type RevalidationRow = {
  id: string;
  parkName: string;
  townCommunity: string | null;
  lga: string | null;
  revalidationNumber: string | null;
  commissionerApprovedAt: Date | null;
  status: string;
  approvalType: string | null;
};

const revalidationWhere = (terms: string[]) => ({
  status: "APPROVED",
  commissionerApprovedAt: { not: null },
  ...wordFilter(terms, (t) => [
    { parkName: like(t) },
    { ownerName: like(t) },
    { revalidationNumber: like(t) },
    { asinNumber: like(t) },
    { lga: like(t) },
    { townCommunity: like(t) },
  ]),
});

const revalidationFetch = (where: Record<string, unknown>, take: number) =>
  db.revalidationApplication.findMany({
    where,
    take,
    orderBy: { commissionerApprovedAt: "desc" },
    select: {
      id: true,
      parkName: true,
      townCommunity: true,
      lga: true,
      revalidationNumber: true,
      commissionerApprovedAt: true,
      status: true,
      approvalType: true,
    },
  }) as never;

const revalidationLetterSource: QueueSource<RevalidationRow> = {
  where: revalidationWhere,
  count: (where) => db.revalidationApplication.count({ where }),
  fetch: revalidationFetch,
  map: (r) => ({
    id: r.id,
    category: "REVALIDATION_CERTIFICATE",
    title: r.parkName,
    subtitle: `Revalidation · ${[r.townCommunity, r.lga].filter(Boolean).join(", ") || "Anambra State"}`,
    refOrCode: `Cert: ${r.revalidationNumber ?? "N/A"}`,
    issueDate: r.commissionerApprovedAt,
    status: r.status,
    printUrl: `/admin/revalidation-queue/${r.id}/certificate`,
    photoUrl: null,
  }),
};

const revalidationCertificateSource: QueueSource<RevalidationRow> = {
  where: revalidationWhere,
  count: (where) => db.revalidationApplication.count({ where }),
  fetch: revalidationFetch,
  map: (r) => ({
    id: `cert-${r.id}`,
    category: "PARK_CERTIFICATE",
    title: r.parkName,
    subtitle: `${r.approvalType === "TEMPORAL" ? "Temporary" : "Full"} approval certificate · ${[r.townCommunity, r.lga].filter(Boolean).join(", ") || "Anambra State"}`,
    refOrCode: `Cert: ${r.revalidationNumber ?? "N/A"}`,
    issueDate: r.commissionerApprovedAt,
    status: r.status,
    printUrl: `/admin/revalidation-queue/${r.id}/park-certificate`,
    photoUrl: null,
  }),
};

type ParkRow = {
  id: string;
  businessName: string;
  transportCompanyName: string | null;
  parkId: string | null;
  permitNumber: string | null;
  permitIssuedAt: Date | null;
  applicationStatus: string;
  lga: string;
  townCity: string;
  updatedAt: Date;
};

const parkColumns = (t: string) => [
  { businessName: like(t) },
  { transportCompanyName: like(t) },
  { parkId: like(t) },
  { permitNumber: like(t) },
  { anssidNumber: like(t) },
  { lga: like(t) },
  { townCity: like(t) },
];

const parkSelect = {
  id: true,
  businessName: true,
  transportCompanyName: true,
  parkId: true,
  permitNumber: true,
  permitIssuedAt: true,
  applicationStatus: true,
  lga: true,
  townCity: true,
  updatedAt: true,
} as const;

/** Parks created from mass transit terminals, each with its own certificate. */
const terminalParkSource: QueueSource<ParkRow> = {
  where: (terms) => ({
    terminal: { isNot: null },
    applicationStatus: { in: ["APPROVED", "TEMPORAL_APPROVAL"] },
    ...wordFilter(terms, parkColumns),
  }),
  count: (where) => db.motorPark.count({ where }),
  fetch: (where, take) =>
    db.motorPark.findMany({
      where,
      take,
      orderBy: { permitIssuedAt: "desc" },
      select: parkSelect,
    }) as never,
  map: (p) => ({
    id: `term-${p.id}`,
    category: "PARK_CERTIFICATE",
    title: p.businessName,
    subtitle: `${p.transportCompanyName ?? "Terminal"} · ${p.applicationStatus === "TEMPORAL_APPROVAL" ? "Temporary" : "Full"} approval`,
    refOrCode: `Park ID: ${p.parkId ?? p.permitNumber ?? "N/A"}`,
    issueDate: p.permitIssuedAt,
    status: p.applicationStatus,
    printUrl: `/motor-parks/${p.id}/park-certificate`,
    photoUrl: null,
  }),
};

/**
 * Motor parks on a temporal approval. The certificate is printable the moment
 * the approval is issued, so it belongs here alongside every other printable.
 */
const temporalParkSource: QueueSource<ParkRow> = {
  where: (terms) => ({
    applicationStatus: "TEMPORAL_APPROVAL",
    ...wordFilter(terms, parkColumns),
  }),
  count: (where) => db.motorPark.count({ where }),
  fetch: (where, take) =>
    db.motorPark.findMany({
      where,
      take,
      orderBy: { updatedAt: "desc" },
      select: parkSelect,
    }) as never,
  map: (p) => ({
    id: p.id,
    category: "TEMPORAL_APPROVAL",
    title: p.businessName,
    subtitle: `Temporary approval · ${[p.townCity, p.lga].filter(Boolean).join(", ") || "Anambra State"}`,
    refOrCode: `Park ID: ${p.parkId ?? p.permitNumber ?? "N/A"}`,
    issueDate: p.updatedAt,
    status: p.applicationStatus,
    printUrl: `/motor-parks/${p.id}/approval-letter`,
    photoUrl: null,
  }),
};

/** Every queue, and whether a TRACAS-only printer may see it. */
const QUEUES: {
  queue: PrintingQueue;
  tracas: boolean;
  sources: QueueSource<never>[];
}[] = [
  { queue: "DRIVER_ID_CARD", tracas: true, sources: [driverSource as never] },
  { queue: "LETTER_OF_AUTHORITY", tracas: true, sources: [vehicleSource as never] },
  { queue: "PARK_STAFF_ID_CARD", tracas: false, sources: [parkMonitorSource as never] },
  { queue: "BOAT_PERMIT", tracas: false, sources: [boatSource as never] },
  { queue: "PARK_STAFF", tracas: false, sources: [parkStaffSource as never] },
  { queue: "MASS_TRANSIT_LETTER", tracas: false, sources: [massTransitSource as never] },
  {
    queue: "REVALIDATION_CERTIFICATE",
    tracas: false,
    sources: [revalidationLetterSource as never],
  },
  {
    queue: "PARK_CERTIFICATE",
    tracas: false,
    // Two sources in one queue: a revalidated park's certificate and a
    // terminal's. Both print the same document for the same purpose.
    sources: [revalidationCertificateSource as never, terminalParkSource as never],
  },
  { queue: "TEMPORAL_APPROVAL", tracas: false, sources: [temporalParkSource as never] },
];

/** Newest first, with undated records last rather than jumbled in. */
function byIssueDateDesc(a: PrintingItem, b: PrintingItem) {
  const at = a.issueDate ? new Date(a.issueDate).getTime() : 0;
  const bt = b.issueDate ? new Date(b.issueDate).getTime() : 0;
  return bt - at;
}

export interface PrintingQueuesResult {
  success: boolean;
  error?: string;
  scope: PrintingScope;
  queue: PrintingQueue;
  search: string;
  page: number;
  pageSize: number;
  /** Rows matching the search in the queue being viewed. */
  total: number;
  totalPages: number;
  items: PrintingItem[];
  /** Real totals for every queue, matching the current search. */
  stats: {
    totalToPrint: number;
    driverIdCardsCount: number;
    lettersCount: number;
    parkStaffCount: number;
    boatPermitsCount: number;
    revalidationCount: number;
    parkCertificateCount: number;
    temporalCount: number;
    parkStaffCardCount: number;
    massTransitCount: number;
  };
}

const EMPTY_STATS = {
  totalToPrint: 0,
  driverIdCardsCount: 0,
  lettersCount: 0,
  parkStaffCount: 0,
  boatPermitsCount: 0,
  revalidationCount: 0,
  parkCertificateCount: 0,
  temporalCount: 0,
  parkStaffCardCount: 0,
  massTransitCount: 0,
};

/**
 * One page of one queue, plus the true size of every queue.
 *
 * Counting and listing are separate on purpose. The badges need a number for
 * each queue on every load, which is ten cheap counts; the list needs rows for
 * the queue actually on screen, which is the expensive part. Fetching all ten
 * queues in full — which is what this did — meant the officer paid for nine
 * lists they were not looking at, and still only saw the first hundred of the
 * one they were.
 */
export async function getIctPrintingQueues(
  options: {
    search?: string;
    queue?: PrintingQueue;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PrintingQueuesResult> {
  const queue = options.queue ?? "ALL";
  const search = options.search ?? "";
  const pageSize = Math.min(Math.max(options.pageSize ?? PRINTING_PAGE_SIZE, 10), 200);
  const page = Math.max(options.page ?? 1, 1);

  // Previously the session was read and discarded, leaving this open to any
  // authenticated user — including external applicants.
  const authz = await authorize([...PRINTING_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: authz.error,
      scope: "ALL",
      queue,
      search,
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      items: [],
      stats: EMPTY_STATS,
    };
  }

  const scope: PrintingScope =
    authz.session.role === "ICT_OFFICER_TRACAS" ? "TRACAS" : "ALL";

  const visible = QUEUES.filter((q) => scope === "ALL" || q.tracas);
  const terms = searchTerms(search);

  // ── Counts: what is actually waiting, per queue ───────────────────────────
  const counted = await Promise.all(
    visible.map(async (q) => {
      const totals = await Promise.all(
        q.sources.map((s) => s.count(s.where(terms))),
      );
      return { queue: q.queue, total: totals.reduce((a, b) => a + b, 0) };
    }),
  );

  const totalFor = (key: PrintingQueue) =>
    counted.find((c) => c.queue === key)?.total ?? 0;

  const stats = {
    totalToPrint: counted.reduce((sum, c) => sum + c.total, 0),
    driverIdCardsCount: totalFor("DRIVER_ID_CARD"),
    lettersCount: totalFor("LETTER_OF_AUTHORITY"),
    parkStaffCount: totalFor("PARK_STAFF_ID_CARD"),
    boatPermitsCount: totalFor("BOAT_PERMIT"),
    revalidationCount: totalFor("REVALIDATION_CERTIFICATE"),
    parkCertificateCount: totalFor("PARK_CERTIFICATE"),
    temporalCount: totalFor("TEMPORAL_APPROVAL"),
    parkStaffCardCount: totalFor("PARK_STAFF"),
    massTransitCount: totalFor("MASS_TRANSIT_LETTER"),
  };

  // ── Items: only the queue on screen ───────────────────────────────────────
  const active = queue === "ALL" ? visible : visible.filter((q) => q.queue === queue);
  const sources = active.flatMap((q) => q.sources);

  const skip = (page - 1) * pageSize;
  // To show rows [skip, skip + pageSize) of a merged, date-ordered list, no
  // source can contribute more than that many rows — so each is asked for
  // exactly that window and never for the whole table.
  const window = skip + pageSize;

  const fetched = await Promise.all(
    sources.map(async (s) => {
      const rows = await s.fetch(s.where(terms), window);
      return rows.map((r) => s.map(r));
    }),
  );

  const merged = fetched.flat().sort(byIssueDateDesc);
  const total = queue === "ALL" ? stats.totalToPrint : totalFor(queue);

  return {
    success: true,
    scope,
    queue,
    search,
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    items: merged.slice(skip, skip + pageSize),
    stats,
  };
}
