# Anambra MOT Platform — Backend Handover Documentation

**Audience:** Backend engineer picking up / extending this system.
**Last updated:** 2026-08-03
**Repo:** `ministry-of-transport` (Next.js 16 App Router, TypeScript)

---

## 1. TL;DR — What this system is

A single Next.js application that digitises the Anambra State Ministry of Transport's regulatory workflows. **There is no separate backend service.** All server logic lives in Next.js **Server Actions** (`app/actions/*.ts`) plus three Route Handlers (`app/api/*`). Data access is Prisma 7 → Neon PostgreSQL.

If you are being brought in as "the backend guy", your surface area is:

- `prisma/schema.prisma` — the data model (34 models, 10 enums)
- `app/actions/*.ts` — ~120 server actions, this is the de-facto API layer
- `app/api/*` — upload, Paystack webhook, Paystack callback
- `lib/*` — auth/session, db client, Paystack client, DO Spaces, email
- `middleware.ts` — edge route protection

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js `16.2.4` (App Router, React 19.2.4) |
| Language | TypeScript 5, strict |
| ORM | Prisma `7.8.0` + `@prisma/adapter-neon` (driver adapter is **required** in Prisma 7) |
| DB | Neon serverless PostgreSQL |
| Auth | Custom JWT sessions via `jose`, HttpOnly cookie `mot-session`, bcryptjs hashes |
| Payments | Paystack (initialize → callback → verify, plus HMAC-SHA512 webhook) |
| File storage | DigitalOcean Spaces (S3-compatible, `@aws-sdk/client-s3`) |
| Email | Resend HTTP API |
| Validation | Zod 4 (`lib/validation-schemas.ts`) |
| UI | Tailwind 4, Radix primitives, lucide-react, recharts, sonner |
| Package manager | pnpm |
| Dev port | `8150` (`pnpm dev`) |

> ⚠️ `AGENTS.md` warns this Next.js version has breaking changes vs. older docs. Read `node_modules/next/dist/docs/` before assuming an API exists.

---

## 2. Running it

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm build` runs `prisma generate && next build`.

### Environment variables (actually used — `.env.example` is STALE)

`.env.example` still references SendGrid, Termii and AWS S3. **None of those are wired up.** The real set, from `.env` and the code:

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | `lib/db.ts` | Neon Postgres connection string |
| `SESSION_SECRET` | `lib/session.ts` | HS256 JWT signing key. **Required** — throws if missing |
| `NEXTAUTH_SECRET` | (legacy, unused) | NextAuth is not installed; safe to drop |
| `NEXT_PUBLIC_APP_URL` | payments, park-monitor | Base URL for Paystack callbacks & QR/ID verify links. Falls back to `http://localhost:8150` |
| `PAYSTACK_SECRET_KEY` | `lib/paystack.ts`, webhook | Also used as the webhook HMAC secret |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | client | |
| `DO_SPACES_KEY` / `_SECRET` / `_ENDPOINT` / `_BUCKET` / `_REGION` / `_PUBLIC_BASE` / `_STORAGE_PREFIX` | `lib/spaces.ts` | Uploads are `ACL: public-read` |
| `RESEND_API_KEY` | `lib/email.ts` | If absent, email is skipped with a warning (non-fatal) |
| `FROM_EMAIL_ADDRESS` | `lib/email.ts` | Defaults to `notifications@mot.anambra.gov.ng` |

**Action item for backend:** rewrite `.env.example` to match reality.

---

## 3. Architecture & conventions

### 3.1 Server Actions are the API

Every mutation/query goes through a `"use server"` function. The house pattern (see `lib/server-actions-pattern.ts` and `lib/QUICK_START.ts` for the full reference implementation):

```ts
"use server";

export async function doThing(input: X): Promise<ActionResult<Y>> {
  const session = await requireRole(["HOD_PARKS"]);   // 1. authN + authZ
  const parsed = someZodSchema.safeParse(input);      // 2. validate
  if (!parsed.success) return { success: false, error: ... };

  const row = await db.$transaction(async (tx) => {   // 3. mutate + audit in one tx
    const r = await tx.motorPark.update({ ... });
    await tx.auditLog.create({ data: { performedByUserId: session.userId, ... } });
    return r;
  });

  revalidatePath("/motor-parks");                     // 4. bust cache
  return { success: true, data: row };
}
```

`ActionResult<T>` is a discriminated union `{ success: true, data: T } | { success: false, error: string }`, defined in `lib/server-actions-pattern.ts`.

### 3.2 Row-Level Security is application-level, not database-level

There is **no Postgres RLS**. Ownership is enforced in code: external applicants are scoped by `contactUserId === session.userId`; ministry staff bypass via `ownsApplication()` in `lib/auth.ts`. **Every new action must re-implement this guard — there is no safety net.**

### 3.3 Sessions

`lib/session.ts` — stateless JWT, HS256, 7-day expiry, sliding refresh in middleware. Payload is deliberately minimal:

```ts
{ userId: string; role: UserRole; departmentId?: string; expiresAt: Date }
```

Cookie: `mot-session`, HttpOnly, `sameSite: lax`, `secure` in production.

> Note: there is a `Session` table in the schema, but the runtime uses **stateless JWTs** — the table is effectively unused. Decide whether to wire it up (for revocation) or drop it.

### 3.4 Auth helpers (`lib/auth.ts`)

`getSession()` · `requireAuth()` · `requireRole(roles[])` · `requireMinistryStaff()` · `requireExecutive()` · `requireHodOrAbove()`
Predicates: `canIssuePermits`, `canScheduleInspections`, `canPerformInspections`, `canManageStaff`, `canViewFullAuditTrail`, `ownsApplication`.

Role groups: `MINISTRY_ROLES` (everything except `EXTERNAL_APPLICANT`), `EXECUTIVE_ROLES` (Commissioner + PS), `HOD_ROLES` (4 HODs), `ADMIN_ROLES` (PS + System Admin).

### 3.5 Middleware (`middleware.ts`, Edge runtime)

- Public routes: `/`, `/login`, `/staff/login`, `/register*`, `/services`, `/apply-park-monitor`, `/unauthorized`, PWA files
- Public prefixes: `/verify/`, `/v/`, `/api/webhooks/`, `/_next/`, `/icons/`, `/public/`
- Ministry-only prefixes: `/admin/`, `/inspections/`, `/staff/`
- Executive-only prefixes: `/admin/config/`, `/admin/staff/`, `/permits/approve/`
- Authenticated users hitting a public auth route are bounced to `/dashboard`
- Refreshes the session cookie on every authenticated request

### 3.6 Prisma client quirk

`lib/db.ts` exports `db` as a **Proxy** around the PrismaClient. It re-instantiates the client during dev hot-reload if a model property is missing (it probes for `tracasVehicle`). This is a dev-ergonomics hack — production takes the plain singleton path. Be aware if you profile connection behaviour.

---

## 4. Roles (13)

| Role | Responsibility |
|---|---|
| `COMMISSIONER` | Final approvals, permit issuance, revocation |
| `PERMANENT_SECRETARY` | Operational authority, staff provisioning, approves inspection schedules |
| `HOD_PARKS` | Parks dept head; schedules inspections, issues Park Monitor IDs |
| `HOD_VIS` | Vehicle Inspection Services head |
| `HOD_TRANSPORT_OPS` | Transport Operations head |
| `HOD_PARKS_REVALIDATION` | Parks Revalidation head |
| `FIELD_INSPECTOR` | Performs site/terminal inspections, submits reports |
| `FINANCE_OFFICER` | Fee assessment, reconciliation, refunds, revenue reports |
| `VEHICLE_INSPECTION_OFFICER` | Mechanical assessment, AVIR completion |
| `EXTERNAL_APPLICANT` | Public: park owners, transit companies |
| `PARK_MONITOR` | Field monitoring staff (role granted on ID issuance) |
| `SYSTEM_ADMIN` | Platform admin; can stand in for most approval roles |
| `ICT_OFFICER` | Printing centre — ID cards, letters of authority, permits |

---

## 5. Data model (`prisma/schema.prisma`)

### 5.1 Enums

| Enum | Values |
|---|---|
| `UserRole` | 13 roles above |
| `ApplicationStatus` | `SUBMITTED`, `UNDER_REVIEW`, `INSPECTION_SCHEDULED`, `INSPECTION_IN_PROGRESS`, `INSPECTION_COMPLETED`, `PENDING_HOD_APPROVAL`, `PENDING_COMMISSIONER_APPROVAL`, `PENDING_PS_APPROVAL`, `PENDING_APPROVAL`, `TEMPORAL_APPROVAL`, `APPROVED`, `REJECTED`, `WAITLISTED`, `REVOKED` |
| `PermitStatus` | `ACTIVE`, `EXPIRED`, `REVOKED`, `SUSPENDED` |
| `InspectionStatus` | `PENDING_PS_APPROVAL`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `REJECTED` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `NotificationType` | 12 types (application, inspection, permit, payment, renewal 60/30-day, SLA breach, system alert) |
| `NotificationChannel` | `EMAIL`, `SMS`, `BOTH` |
| `VehicleType` | `BUS`, `MINIBUS`, `TRUCK`, `LIGHT_COMMERCIAL`, `TANKER`, `PRIVATE_CAR`, `TAXI`, `RIDE_HAILING` |
| `AVIRConditionBefore` | `GOOD`, `FAIR`, `POOR`, `DEFECTIVE` |
| `AVIRConditionAfter` | `INTACT`, `DAMAGED`, `DESTROYED`, `PARTIALLY_DAMAGED` |
| `ParkStaffStatus` | `ACTIVE`, `SUSPENDED`, `INACTIVE` |

### 5.2 Models by module

**Core / auth**
- `User` — email + optional phone/ASIN unique; `passwordHash` nullable (passwordless applicants); `departmentId` for HOD routing; `registeredService` (`MOTOR_PARK` \| `MASS_TRANSIT`) set at applicant registration; access flags `hasEntranceExitAccess`, `hasGatehouseAccess`
- `Session` — present but unused at runtime (see §3.3)

**Documents**
- `Document` — polymorphic via `linkedToType` + `linkedToId` (no FK). Note: `app/api/upload` creates rows with `linkedToId: "pending"`, patched after the parent record exists. Orphaned `"pending"` rows are a real cleanup concern.
- `DocumentReview` — one review slot per (`documentId`, `reviewedByUserId`), upserted, with role/name snapshots so multiple reviewers never clobber each other

**Motor Parks**
- `MotorPark` — split address (`streetAddress`/`lga`/`townCity`), `anssidNumber` unique, doc-ID pointers (land ownership, CAC, corporate ASIN) + facility photo IDs (toilet, waiting area, signage, water), permit fields, fee amounts (kobo), separate `hodApprovedAt` / `psApprovedAt` / `commissionerApprovedAt` timestamps, revalidation dates
- `MotorParkDraft` — one per user, `Json` payload + `stepReached`, resumable wizard
- `MotorParkFee` — `APPLICATION` \| `MONTHLY_LEVY` \| `ANNUAL` \| `REVALIDATION`, amount in kobo
- `ParkStaff` — per-park sequential `parkSerialNumber`, unique `securityCode` (`MOT-[PARK]-[N]`), QR + photo URLs

**Inspections (shared by parks & transit)**
- `Inspection` — polymorphic `linkedEntityType`/`linkedEntityId` (plus a real `motorParkId` FK), `inspectionType` `INITIAL`/`RE_INSPECTION`, PS approval gate fields, inspector assignment, findings, `recommendedAction`
- `InspectionChecklistTemplate` → `InspectionChecklistItem` → `InspectionChecklistResult` (compliance flag, notes, photo URLs as JSON text, score)

**Mass Transit**
- `MassTransitCompany` — unique `cacNumber` + `asinNumber`, `minFleetSize` default 5, `approvedColour` branding, terminal inspection due date (5 working days), permit + fee fields
- `Terminal` — location + mandatory manager block
- `VehicleSubmissionRequest` → `VehicleSubmission` — post-application flow where a Commissioner/HOD asks the operator to submit N vehicles
- `Vehicle` — unique registration/engine/chassis, optional driver assignment, `routesServed`, QR code link
- `Driver` → `DriverProficiencyCard` (1:1), unique licence number
- `VehicleQRCode` — encoded data + image URL
- `CompanyStaff`

**Payments**
- `Payment` — Paystack transaction/access-code/authorization-URL, payer snapshot (user, ASIN, email, phone), **amount always in kobo**, `paymentType` and polymorphic `linkedEntityType`/`Id` **plus** optional real FKs `motorParkId` / `massTransitCompanyId`, webhook receipt timestamps, reconciliation block, retry counters
- `PaymentReceipt` — 1:1 with Payment, unique `receiptNumber`, stored HTML + optional PDF URL
- `Revenue` — accounting ledger with `revenueCode`. ⚠️ **Has no relations and no FK to `Payment` despite `paymentId @unique`** — worth fixing.
- `FeeSchedule` — versioned fee catalogue with `effectiveFrom`/`effectiveTo`

**AVIR (Accident Vehicle Inspection Report — Government Form 0051)**
- `AVIRReport` — the biggest single model. Accident details, police block, full vehicle particulars, insurance, roadworthiness, **14 `conditionBefore*` fields** and **14 `conditionAfter*` fields**, cause/remarks, VIO sign-off + digital signature, routing/ack timestamps for the Security and MOT dashboards, police copy delivery method.
  ⚠️ **Schema and Zod schema exist; there are no server actions and no UI for AVIR yet.** This is the single largest unimplemented feature.

**Notifications**
- `NotificationPreference` (1:1 user), `Notification` (delivery status, per-channel sent flags, retry counters), `NotificationTemplate` (per type, email HTML/text + SMS body, `{{variable}}` placeholders)
  ⚠️ **No dispatch service exists.** The only email actually sent is the inspection-approval notice in `lib/email.ts`. No SMS provider is wired at all.

**Admin / audit**
- `AuditLog` — actor, action, entity type/id, old/new values as JSON text, IP, user agent
- `SystemConfiguration` — key/value store
- `Application` — generic polymorphic application header with `applicationNumber`. Partially used; the module-specific tables carry the real state.

**Park Monitor**
- `ParkMonitorApplication` — sections A–H of the paper form (biodata, education, employment, health, security screening, suitability, referees as `Json`, next of kin), review outcome, ID-card issuance block (photo, payment link, QR, issued-by)

**Revalidation**
- `RevalidationApplication` — sections A–H (applicant, ASIN/NIN/TIN, park info, operations, facilities as `Json`, regulatory compliance booleans, staffing counts, revenue estimates), links back to `MotorPark`/`MassTransitCompany` for carry-forward, three-tier approval timestamps, `validUntil`
- `RevalidationDraft` — same resumable-wizard pattern as parks

**Maritime**
- `Boat`, `BoatRider`, `BoatSticker` — sticker pool assigned 1:1 to boats; boats carry a unique `securityCode` for public verification

**TRACAS** (state transit fleet)
- `TracasVehicle` — unique registration / fleet number / `authorityRef`, insurance + particulars validity dates, route, ownership (government vs private) with owner details, authority letter issue/expiry
- `TracasDriver` — full personal dossier (NIN, ASIN, next of kin, emergency contact, guarantor, licence, association), unique `securityCode` for ID cards
- `TracasSticker` — sticker pool, 1:1 to vehicle

### 5.3 Money convention

**All amounts are integers in kobo.** `nairaToKobo()` / `formatNaira()` live in `lib/paystack.ts`. Never store naira.

---

## 6. Features, module by module

### 6.1 Authentication & accounts — `app/actions/auth.ts`

| Action | Guard | Notes |
|---|---|---|
| `login` | public | Staff login (email + password, bcrypt) |
| `loginApplicant` | public | Applicant login path |
| `registerApplicant` | public | Creates `EXTERNAL_APPLICANT`, sets `registeredService` |
| `addApplicantService` | authed | Lets an applicant opt into a second service |
| `getMyProfile` | authed | |
| `logout` | authed | Clears cookie, redirects |
| `provisionStaffAccount` | PS / Admin | Creates ministry staff |
| `changePassword` | authed | |
| `deactivateStaffAccount` | PS / Admin | Soft disable via `isActive` |

Routes: `/login`, `/staff/login`, `/register`, `/register/motor-park`, `/register/mass-transit`, `/register/revalidation`.

### 6.2 Motor Parks — `app/actions/motor-park.ts` (~63 KB, the core module)

Full lifecycle:

```
EXTERNAL_APPLICANT  submitParkApplication          → SUBMITTED
HOD                 scheduleParkInspection         → INSPECTION_SCHEDULED  (Inspection = PENDING_PS_APPROVAL)
PS                  approveScheduledInspection     → Inspection SCHEDULED  (+ email to PS on schedule)
FIELD_INSPECTOR     saveInspectionDraft / submitInspectionReport
                                                   → Inspection COMPLETED, park PENDING_HOD_APPROVAL
HOD_PARKS           hodApproveMotorPark            → PENDING_PS_APPROVAL
PERMANENT_SECRETARY psApproveMotorPark             → PENDING_COMMISSIONER_APPROVAL (+ creates fee)
COMMISSIONER        issuePermitToBuild             → APPROVED
COMMISSIONER/PS     issueTemporalApproval          → TEMPORAL_APPROVAL
COMMISSIONER        issueFinalApproval             → APPROVED (permit issued)
COMMISSIONER/PS     revokeParkPermit               → REVOKED
```

Supporting actions: `listMotorParks` (filtered, ownership-scoped), `getMotorPark`, `requestReInspection` (applicant, resets to `SUBMITTED`), `recordFeeAssessment` (Finance), `recordProximityEvaluation`, `verifyDocument` (per-reviewer `DocumentReview` upsert), `updateParkDocuments` (applicant re-upload), `getMotorParkChecklistTemplate`, `getInspection`, `getFieldInspectors`, `getParkStatusSummary`, `initiateRevalidation` / `triggerRevalidation`.

Draft persistence: `motor-park-draft.ts` — `loadParkDraft` / `saveParkDraft` / `clearParkDraft`.

Park staff: `park-staff.ts` — `onboardParkStaff` (auto-assigns `parkSerialNumber` + `securityCode`), `deleteParkStaff`; ID card page at `/motor-parks/[id]/staff/[staffId]/id-card`.

Routes under `/motor-parks/[id]/`: `inspect`, `schedule-inspection`, `assess-fees`, `issue-permit`, `issue-temporal-approval`, `issue-final-approval`, `temporal-certificate`, `proximity-evaluation`, `request-reinspection`, `revoke`, `upload-documents`, `initiate-revalidation`, `staff`, `pay`.

### 6.3 Mass Transit / Fleet Operators — `app/actions/mass-transit.ts` (~57 KB)

```
EXTERNAL_APPLICANT  submitFleetApplication
HOD                 scheduleTerminalInspection     (5-working-day SLA field exists)
FIELD_INSPECTOR     submitTerminalInspectionReport
HOD                 hodApproveFleetOperator
PS                  psApproveFleetOperator
COMMISSIONER        issuePermitToOperate
```

Plus: `addVehicle` / `removeVehicle` (applicant), `approveBrandingScheme` (approves `approvedColour`), `generateVehicleQRCode`, `issueDriverProficiencyCard`, `initiateAnnualRenewal`, `getFleetInspectors`, `getFleetStatusSummary`, and the vehicle-submission-request loop: `requestVehicleSubmission` (staff) → `getPendingVehicleSubmissionRequests` → `submitVehicleDetails` (applicant).

Routes: `/fleet-operators`, `/fleet-operators/[id]/{inspect,schedule-inspection,add-vehicle,approve-branding,fleet-change,generate-qr,initiate-renewal,issue-driver-card,issue-permit,pay}`, `/fleet-operators/submit-vehicles`.

### 6.4 Inspections (cross-module) — `app/actions/inspections.ts`

`listInspections`, `approveScheduledInspection`, `rejectScheduledInspection`. The PS approval gate sits between HOD scheduling and inspector execution; scheduling fires an email to all active PS users via `lib/email.ts` (Resend).

### 6.5 Payments — `app/actions/payments.ts` (~30 KB)

Flow:
1. Finance assesses a fee → `MotorParkFee` row (or transit registration fee)
2. Applicant hits `/motor-parks/[id]/pay?feeId=…` or `/fleet-operators/[id]/pay`
3. `initiateMotorParkFeePayment` / `initiateTransitPayment` / `initiateParkMonitorIdPayment` → Paystack `initializeTransaction`, redirect to checkout
4. Paystack → `GET /api/payment/callback?reference=…&returnTo=…` → `verifyAndCompletePayment` → redirect to `/payment/result`
5. Webhook `POST /api/webhooks/paystack` (`charge.success` / `failed` / `abandoned`) also calls `verifyAndCompletePayment` — **idempotent by design**

Known fees: transit registration `TRANSIT_REGISTRATION_FEE_KOBO = ₦10,000`; Park Monitor ID card `₦20,000` (hard-coded inline in `payments.ts` — should move to `FeeSchedule`).

Reference prefixes: `MPFEE-…` (park fee), `PMID-…` (park monitor ID), generated by `generateReference(prefix)`.

Reporting: `listPayments`, `getPaymentDetail`, `initiateRefund` (Finance/Exec), `getArrearsItems`, `getRevenueStats`. Routes: `/payments`, `/payments/[id]`, `/payments/[id]/refund`, `/payments/arrears`, `/payments/revenue`.

Webhook security: HMAC-SHA512 over the raw body against `x-paystack-signature`, compared to `PAYSTACK_SECRET_KEY`. Returns 200 immediately, processes fire-and-forget.
⚠️ Signature comparison uses `!==`, not `crypto.timingSafeEqual` — worth hardening.

### 6.6 Revalidation — `revalidation.ts`, `revalidation-workflow.ts`, `revalidation-draft.ts`

`getExistingParkForRevalidation` (carry-forward from an existing `MotorPark`), `submitRevalidationApplication`, resumable draft, then `scheduleRevalidationInspection` → `submitRevalidationFindings` → `hodApproveRevalidation` → `psApproveRevalidation` → `commissionerApproveRevalidation` (or `rejectRevalidation`). Admin queue at `/admin/revalidation-queue`.

### 6.7 Park Monitor — `app/actions/park-monitor.ts`

Public application at `/apply-park-monitor` → `submitParkMonitorApplication` → `reviewParkMonitorApplication` (approve / reject / waitlist) → applicant pays ₦20,000 → `updateParkMonitorPhoto` → `issueParkMonitorId` (HOD_PARKS / SYSTEM_ADMIN only). Issuance generates a verify URL, a QR via the public `api.qrserver.com` service, and **promotes the user's role to `PARK_MONITOR`**.
⚠️ The QR depends on a third-party public API at render time — replace with self-generated QRs stored in Spaces.

Routes: `/admin/park-monitors`, `/admin/park-monitors/[id]`, `/park-monitor/claim-id`.

### 6.8 TRACAS — `app/actions/tracas.ts`

State transit fleet register. Sticker pool management (`addStickerUrlsToTracasPool`, `getAvailableTracasStickers`, `getTracasStickersList`, `assignStickerToTracasVehicle`), `onboardTracasVehicle`, `onboardTracasDriver`, `reassignTracasDriver`, `getTracasFleetData`, `getTracasDriverData`, `getTracasAuthorityLetterData`, `getPublicTracasVerification`.

Routes: `/tracas`, `/tracas/[id]`, `/tracas/[id]/letter` (Letter of Authority print), `/tracas/driver/[id]/id-card`. Public: `/verify/tracas/[id]`, `/verify/tracas-driver/[id]`, `/v/tracas/[id]`.

Seed scripts: `seed-tracas.ts`, `seed-tracas-stickers.ts` (run with `tsx`).

### 6.9 Maritime / Boats — `app/actions/boats.ts`

`addStickerUrlsToPool`, `getAvailableStickers`, `getStickersList`, `onboardBoat`, `assignStickerToBoat`, `onboardRider`, `reassignRider`, `getBoatsList`, `getBoatRidersList`, `getBoatPublicVerification`. Routes: `/boats`, public `/verify/boat/[id]`. Seed: `seed-stickers.ts`.

### 6.10 ICT Printing Centre — `app/actions/ict-printing.ts`

`getIctPrintingQueues(searchQuery)` aggregates four print queues into one feed: TRACAS driver ID cards, TRACAS letters of authority, park staff/monitor ID cards, boat permits. Returns counts + filtered item lists. Route `/ict-printing`.
⚠️ Auth is `await getSessionFromCookie()` with the result **discarded** — no role check. Should be `requireRole(["ICT_OFFICER", …])`. Also takes a flat `take: 100` per source with no pagination, and casts park-monitor rows to `any` to read fields that don't exist on the model (`fullName`, `parkName`, `preferredLocation`) — those render as fallbacks today.

### 6.11 Public verification (no auth) — `app/actions/public-verify.ts` + `/verify/*`

`searchPublicMotorParks`, `getBoatPublicVerification`, `getPublicTracasVerification`, park staff lookup. Pages: `/verify/motor-parks`, `/verify/park-staff/[id]`, `/verify/boat/[id]`, `/verify/tracas/[id]`, `/verify/tracas-driver/[id]`, short link `/v/tracas/[id]`.

### 6.12 Admin — `app/actions/admin.ts`

Staff: `listStaffUsers`, `getStaffUser`, `updateStaffUser`, `toggleStaffActive`.
Audit: `listAuditLogs` (paginated).
Fees: `listFeeSchedules`, `createFeeSchedule`, `toggleFeeScheduleActive`.
Checklists: `listChecklistTemplates`.
Config: `listSystemConfig`, `upsertSystemConfig`.
Monitoring: `getSystemHealth`.
Export: `getExportData`.

Routes: `/admin/{users,audit,fees,checklists,config,monitoring,export,park-monitors,revalidation-queue}`.

### 6.13 Executive dashboard — `app/actions/executive-dashboard.ts`

`getExecutiveDashboardStats` → total revenue, active personnel, registered transport, compliance rate, sector breakdown, recent activity feed.
⚠️ **Two problems for you:** (a) no auth guard at all — any authenticated user could call it; (b) `revenueData` for the line chart is **hard-coded dummy data** with a comment saying real monthly aggregation is needed. Replace with a `Payment` group-by-month query.

### 6.14 Uploads — `app/api/upload/route.ts` + `app/actions/upload.ts`

`POST /api/upload` (multipart: `file`, `folder`, `linkedToType`). Session required. Validates MIME (`pdf`, `jpeg`, `png`, `webp`) and 5 MB max, uploads to DO Spaces with `ACL: public-read`, creates a `Document` row with `linkedToId: "pending"`. Server actions `uploadCacDocument`, `uploadGenericDocument` wrap the same path.

---

## 7. Route map

### Public
`/` · `/services` · `/login` · `/staff/login` · `/register` (+ `/motor-park`, `/mass-transit`, `/revalidation`) · `/apply-park-monitor` · `/verify/*` · `/v/tracas/[id]` · `/unauthorized`

### Dashboard (authenticated)
`/dashboard` · `/dashboard/services/[service]` · `/motor-parks/*` · `/fleet-operators/*` · `/revalidation/*` · `/inspections` · `/payments/*` · `/payment/{callback,result}` · `/boats` · `/tracas/*` · `/ict-printing` · `/park-monitor/claim-id` · `/admin/*`

### API
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/upload` | session cookie |
| `GET` | `/api/payment/callback` | none (Paystack redirect, verifies by reference) |
| `POST` | `/api/webhooks/paystack` | HMAC-SHA512 signature |

---

## 8. Known gaps & backend TODO list

Ordered roughly by risk:

1. **AVIR module is schema-only.** `AVIRReport` + `avIRReportSchema` exist; zero actions, zero UI. Whole EPIC-006 is unbuilt.
2. **Notification system is schema-only.** `Notification`, `NotificationTemplate`, `NotificationPreference` have no dispatcher. No SMS provider wired. Only the inspection-approval email actually sends. Renewal reminders (60/30-day) and SLA-breach alerts need a scheduler/cron — none exists.
3. **No role guard on `getIctPrintingQueues` or `getExecutiveDashboardStats`.**
4. **Executive dashboard revenue chart returns fabricated numbers.** Must be replaced before any executive demo.
5. **`Revenue` table has no FK to `Payment`** and is not written to by `verifyAndCompletePayment` as far as the ledger is concerned — reconciliation is incomplete.
6. **Orphaned `Document` rows** with `linkedToId: "pending"` when a wizard is abandoned. Needs a cleanup job or a two-phase commit.
7. **Webhook signature compare is not constant-time.**
8. **`Session` table unused** — no server-side revocation. A leaked JWT is valid for 7 days.
9. **Park Monitor QR generation depends on `api.qrserver.com`.**
10. **`.env.example` is stale** (SendGrid/Termii/AWS vs. actual Resend/DO Spaces).
11. **Hard-coded fees** (₦20,000 park monitor ID) bypass `FeeSchedule`.
12. **No pagination** on several list actions (`getIctPrintingQueues`, sticker lists) — flat `take: 100`.
13. **No prisma migrations directory checked in** — schema is pushed, not migrated. Decide on a migration strategy before production.
14. **No automated tests** anywhere in the repo.
15. **`prisma/schema.prisma` `datasource db` has no `url`** — intentional under Prisma 7 driver adapters, but means CLI commands need `prisma.config.ts` (present) to resolve the connection.

---

## 9. Where to look for more

| File | What it holds |
|---|---|
| `lib/server-actions-pattern.ts` | The canonical server-action template with commentary — read this first |
| `lib/QUICK_START.ts` | Worked examples of the pattern |
| `lib/validation-schemas.ts` | All Zod schemas, including the (unused) AVIR one |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/EPICS.md` | EPIC/STORY breakdown referenced by code comments |
| `docs/ROLES_AND_DUTIES.md` | Full role permission matrix |
| `docs/PAYSTACK_INTEGRATION.md` | Payment integration spec |
| `docs/IMPLEMENTATION_PLAN.md` | Original plan |
| `docs/PROGRESS.md` | Delivery status |
| `docs/PARK MONITOR.md`, `docs/anambra_mot_revalidation_form_2026.md` | Source forms the models are derived from |
| `.copilot-instructions.md` | Coding conventions used throughout |
