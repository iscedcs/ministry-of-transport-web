# Progress Tracker — Ministry of Transport Platform

**Real-time Sprint Tracking & Release Timeline**

---

## Project Status Overview

| Metric               | Status                 | Notes                                         |
| -------------------- | ---------------------- | --------------------------------------------- |
| **Project Phase**    | Phase 1 (Development)  | Sprint 1 active; foundation complete          |
| **Overall Progress** | ~18%                   | 8 stories done (50 pts); Sprint 1 in progress |
| **Critical Path**    | 🟢 On Track            | Foundation → Auth → Motor Park → Payments     |
| **Blockers**         | PayDirect Integration  | Awaiting Ministry Finance integration specs   |
| **Next Milestone**   | Phase 1 Pilot (Week 8) | Motor Park + Mass Transit + AVIR ready        |

---

## Release Timeline

### Phase 1: Core Platform (Weeks 1–8)

| Week     | Sprint   | Focus                      | Target Deliverables                                             | Status         |
| -------- | -------- | -------------------------- | --------------------------------------------------------------- | -------------- |
| **W1–2** | Sprint 1 | Foundation & Design System | Project setup, design tokens, UI components, database           | � In Progress  |
| **W3–4** | Sprint 2 | Motor Park Module          | Park application, inspection workflow, Permit to Build          | 🔴 Not Started |
| **W5–6** | Sprint 3 | Mass Transit & Payments    | Transit registration, Paystack integration, fee collection      | 🔴 Not Started |
| **W7**   | Sprint 4 | AVIR Module                | Accident vehicle inspection reports, police routing             | 🔴 Not Started |
| **W8**   | Sprint 5 | Admin & Pilot Prep         | Ministry admin panel, launch readiness, user acceptance testing | 🔴 Not Started |

### Phase 2: Extended Services (Weeks 9–14)

| Week      | Sprint    | Focus                      | Target Deliverables                               | Status     |
| --------- | --------- | -------------------------- | ------------------------------------------------- | ---------- |
| **W9–10** | Sprint 6  | VIS Module                 | Vehicle inspection data intake, two-track routing | 🔴 Planned |
| **W11**   | Sprint 7  | Driving Schools            | School registration, certificate workflow         | 🔴 Planned |
| **W12**   | Sprint 8  | Towing & Location Services | Dispatch coordination, real-time tracking         | 🔴 Planned |
| **W13**   | Sprint 9  | Advanced Reporting         | Analytics dashboards, export functionality        | 🔴 Planned |
| **W14**   | Sprint 10 | Performance & Hardening    | Optimization, security audit, load testing        | 🔴 Planned |

### Phase 3: Post-Launch (Weeks 15–16)

| Week       | Sprint    | Focus            | Target Deliverables                              | Status     |
| ---------- | --------- | ---------------- | ------------------------------------------------ | ---------- |
| **W15–16** | Sprint 11 | Phase 3 Planning | Requirements, design, roadmap for future modules | 🔴 Planned |

---

## Epic Progress

### Phase 1 Epics

#### EPIC-001: Foundation & Authentication

**Status:** 🔄 In Progress | **Progress:** 80% (8/10 stories) | **Points Done:** 50/57

| Story     | Points | Status         | Assignee | Notes                                                                                                                                                                                                                                                   |
| --------- | ------ | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-001 | 8      | ✅ Complete    | Agent    | Project setup — Next.js 16, pnpm, TypeScript, all deps installed                                                                                                                                                                                        |
| STORY-002 | 5      | ✅ Complete    | Agent    | Design tokens — app/globals.css OKLCH token system, Tailwind v4 theme, animations                                                                                                                                                                       |
| STORY-003 | 8      | ✅ Complete    | Agent    | UI components — shadcn/ui migration: Button, Card, Badge, Alert, Dialog, Input, Textarea, Label, Select, Checkbox, Breadcrumb, Separator + custom form.tsx, modal.tsx, data-table.tsx, pagination.tsx, misc.tsx — all Tailwind-based (no component CSS) |
| STORY-004 | 8      | ✅ Complete    | Agent    | Database schema — 26 models, 9 enums, Prisma 7, Zod schemas                                                                                                                                                                                             |
| STORY-005 | 5      | ✅ Complete    | Agent    | Neon deployment — `prisma db push` successful ✔                                                                                                                                                                                                         |
| STORY-006 | 8      | ✅ Complete    | Agent    | Auth framework — lib/session.ts JWT, lib/auth.ts, middleware.ts                                                                                                                                                                                         |
| STORY-007 | 5      | ✅ Complete    | Agent    | Login + register flows — app/actions/auth.ts                                                                                                                                                                                                            |
| STORY-008 | 5      | ⬜ Not Started | —        | 2FA / password reset (deferred)                                                                                                                                                                                                                         |
| STORY-009 | 3      | ✅ Complete    | Agent    | Env config — `.env.example` with all vars; `prisma.config.ts`                                                                                                                                                                                           |
| STORY-010 | 5      | ⬜ Not Started | —        | CI/CD pipeline                                                                                                                                                                                                                                          |

**Completed this sprint:**

- ✅ `prisma/schema.prisma` — 26 models (MotorPark, MassTransitCompany, Vehicle, Inspection, Payment, AVIRReport, Notification, AuditLog, Application + 15 supporting), 9 enums
- ✅ `prisma.config.ts` — Prisma 7 datasource config (URL moved out of schema, driver adapter pattern)
- ✅ `lib/db.ts` — PrismaClient singleton with `@prisma/adapter-neon` + `Pool`
- ✅ `lib/server-actions-pattern.ts` — RLS patterns, 4 action templates, audit/notification helpers
- ✅ `lib/validation-schemas.ts` — Zod schemas for all modules + naira/kobo utilities
- ✅ `prisma/seed.ts` — Inspection checklists (FR-012/015), fee schedules, notification templates, system config
- ✅ `docs/ARCHITECTURE.md` + `lib/QUICK_START.ts` — Developer reference docs
- ✅ `pnpm prisma generate` → Prisma Client v7.8.0 generated
- ✅ `npx prisma db push` → All 26 tables synced to Neon ✔
- ✅ `jose 6.2.2` + `bcryptjs 3.0.3` installed — JWT sessions + password hashing
- ✅ `lib/session.ts` — JWT encrypt/decrypt, `createSession`, `refreshSession`, `deleteSession` (7-day sliding expiry, HttpOnly cookie)
- ✅ `lib/auth.ts` — `getSession`, `requireAuth`, `requireRole`, `requireExecutive`, `requireHodOrAbove` + permission check helpers
- ✅ `app/actions/auth.ts` — `login`, `registerApplicant`, `logout`, `provisionStaffAccount`, `changePassword`, `deactivateStaffAccount`
- ✅ `middleware.ts` — Edge route protection: public/authenticated/ministry-only/executive-only route guards + sliding session refresh
- ✅ **shadcn/ui migration** — Migrated all UI components from custom CSS classes to Tailwind + shadcn/ui:
  - `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
  - `components.json` — shadcn CLI config
  - `app/globals.css` — stripped to tokens + keyframes only (was 1023 lines → 313 lines); `@theme inline` extended with shadcn color mapping
  - shadcn components installed: button, card, badge, alert, dialog, input, textarea, label, select, checkbox, breadcrumb, separator
  - Custom components rewritten with Tailwind: form.tsx, modal.tsx, data-table.tsx, pagination.tsx, misc.tsx
  - `StatusPill` component added to badge.tsx (maps 19 Prisma workflow statuses)
  - Auth pages (`login/page.tsx`, `register/page.tsx`, `(auth)/layout.tsx`) — rewritten with shadcn Card + Tailwind
  - Dashboard shell (`sidebar.tsx`, `topbar.tsx`, `(dashboard)/layout.tsx`) — rewritten with Tailwind; `topbar.tsx` created

**Blockers:** None  
**Next Steps:** STORY-010 (CI/CD pipeline), then EPIC-002 (Motor Park Module)

---

#### EPIC-002: Motor Park Module

**Status:** ✅ Complete | **Progress:** 100% (14/14 stories) | **Points Done:** 52/52

| Story     | Points | Status      | Assignee | Notes                                                                                                                                                             |
| --------- | ------ | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-020 | 5      | ✅ Complete | Agent    | Domain model — server actions in `app/actions/motor-park.ts` (all 12 actions), types defined                                                                      |
| STORY-021 | 5      | ✅ Complete | Agent    | Application form — `app/(dashboard)/motor-parks/apply/page.tsx` — all FR-010 fields, success state, Card layout                                                   |
| STORY-022 | 3      | ✅ Complete | Agent    | Document upload — `motor-parks/[id]/upload-documents/page.tsx` — CAC cert + land doc URL inputs; `updateParkDocuments` action                                     |
| STORY-023 | 5      | ✅ Complete | Agent    | Inspection scheduling — `motor-parks/[id]/schedule-inspection/page.tsx` — inspector assignment, type, date, station                                               |
| STORY-024 | 5      | ✅ Complete | Agent    | Inspection checklist — `motor-parks/[id]/inspect/[inspectionId]/page.tsx` — FR-012 standards, per-item compliance, assessment + recommendation                    |
| STORY-025 | 5      | ✅ Complete | Agent    | Report workflow — `submitInspectionReport` server action wired to checklist form; status → INSPECTION_COMPLETED                                                   |
| STORY-026 | 3      | ✅ Complete | Agent    | Permit issuance — `motor-parks/[id]/issue-permit/page.tsx` — form + `issuePermitToBuild` action; conditions field                                                 |
| STORY-027 | 5      | ✅ Complete | Agent    | Re-inspection — `motor-parks/[id]/request-reinspection/page.tsx` — applicant notifies construction complete; `requestReInspection` action                         |
| STORY-028 | 3      | ✅ Complete | Agent    | Proximity evaluation — `motor-parks/[id]/proximity-evaluation/page.tsx` — 3-factor FR-015 form; PASS/CONDITIONAL/FAIL verdict; `recordProximityEvaluation` action |
| STORY-029 | 3      | ✅ Complete | Agent    | Fee assessment — `motor-parks/[id]/assess-fees/page.tsx` — feeType, ₦ amount (converted to kobo), due date; `recordFeeAssessment` action                          |
| STORY-030 | 3      | ✅ Complete | Agent    | Approval letter — `motor-parks/[id]/issue-final-approval/page.tsx` — terms + conditions; `issueFinalApproval` action; 1-yr revalidation                           |
| STORY-031 | 3      | ✅ Complete | Agent    | Revalidation reminder — `motor-parks/[id]/initiate-revalidation/page.tsx` — workflow explainer + confirm; `triggerRevalidation` FormData wrapper                  |
| STORY-032 | 3      | ✅ Complete | Agent    | Revocation — `motor-parks/[id]/revoke/page.tsx` — reason textarea (min 10 chars); destructive confirm; `revokeParkPermit` action                                  |
| STORY-033 | 3      | ✅ Complete | Agent    | Status dashboard — `app/(dashboard)/dashboard/page.tsx` + `app/(dashboard)/motor-parks/page.tsx` with role-filtered list                                          |

**Completed this sprint:**

- ✅ `app/actions/motor-park.ts` — 12 server actions: submitParkApplication, listMotorParks, getMotorPark, scheduleParkInspection, submitInspectionReport, issuePermitToBuild, requestReInspection, recordFeeAssessment, issueFinalApproval, revokeParkPermit, initiateRevalidation, getParkStatusSummary
- ✅ `app/(dashboard)/dashboard/page.tsx` — Home dashboard with status summary stats + quick links (role-aware)
- ✅ `app/(dashboard)/motor-parks/page.tsx` — Motor parks list with status filter tabs, role-based RLS (applicants see own; staff see all), paginated table with StatusPill
- ✅ `app/(dashboard)/motor-parks/apply/page.tsx` — Application form (FR-010): 3-section Card layout, business/location/contact fields, success state, CAC + ANSSID validation
- ✅ `app/(dashboard)/motor-parks/[id]/page.tsx` — Detail page: full application + permit info, inspection history, fee history, role-gated action bar (Schedule / Inspect / Issue PTB / Final Approval / Request Re-Inspection)
- ✅ `app/(dashboard)/motor-parks/[id]/schedule-inspection/page.tsx` — Inspection scheduling (FR-011): inspector dropdown (live from DB), type selector, date picker, station field
- ✅ `app/(dashboard)/motor-parks/[id]/inspect/[inspectionId]/page.tsx` — Inspection checklist (FR-012): loads active MOTOR_PARK template, per-item compliant/notes, compliance progress bar, overall assessment + APPROVE/CONDITIONAL/REJECT recommendation
- ✅ `app/(dashboard)/motor-parks/[id]/issue-permit/page.tsx` — Issue Permit to Build (FR-013): approval notes field; auto-generates PTB permit number
- ✅ `app/(dashboard)/motor-parks/[id]/request-reinspection/page.tsx` — Request Re-Inspection (FR-014): completion notes; notifies Ministry construction is done
- ✅ `app/(dashboard)/motor-parks/[id]/assess-fees/page.tsx` — Fee Assessment (FR-016): feeType select, ₦ naira input (→ kobo hidden field), due date picker
- ✅ `app/(dashboard)/motor-parks/[id]/issue-final-approval/page.tsx` — Final Approval Letter (FR-017): terms/conditions; sets ACTIVE + 1-yr revalidation date
- ✅ `app/(dashboard)/motor-parks/[id]/revoke/page.tsx` — Revocation (FR-019): destructive confirm UI, mandatory reason, sets status → REVOKED
- ✅ `app/(dashboard)/motor-parks/[id]/upload-documents/page.tsx` — Document Upload (FR-010): CAC cert + land doc URL fields; `updateParkDocuments` action
- ✅ `app/(dashboard)/motor-parks/[id]/proximity-evaluation/page.tsx` — Proximity Evaluation (FR-015): 3-factor radio UI + distance fields; PASS/CONDITIONAL/FAIL verdict; advances status to PENDING_APPROVAL or REJECTED
- ✅ `app/(dashboard)/motor-parks/[id]/initiate-revalidation/page.tsx` — Revalidation (FR-018): step-by-step workflow explainer, confirm action; `triggerRevalidation` wrapper
- ✅ `app/(dashboard)/motor-parks/[id]/page.tsx` — Action bar fully complete: 10 role-gated actions across the full workflow lifecycle
- ✅ `app/actions/motor-park.ts` — 3 new exports: `updateParkDocuments`, `recordProximityEvaluation`, `triggerRevalidation` (17 total)

**Blockers:** None  
**Next Steps:** Continue EPIC-003 (Mass Transit — testing & STORY-046 doc verification)

---

#### EPIC-003: Mass Transit & Fleet Operator Module

**Status:** 🟡 In Progress | **Progress:** 92% (11/12 stories)

| Story     | Points | Status         | Assignee | Notes                                                        |
| --------- | ------ | -------------- | -------- | ------------------------------------------------------------ |
| STORY-040 | 5      | ✅ Done        | —        | Server actions (mass-transit.ts, 13 actions)                 |
| STORY-041 | 5      | ✅ Done        | —        | fleet-operators/apply/page.tsx (multi-vehicle form)          |
| STORY-042 | 3      | ✅ Done        | —        | [id]/add-vehicle/page.tsx                                    |
| STORY-043 | 3      | ✅ Done        | —        | [id]/issue-driver-card/page.tsx                              |
| STORY-044 | 3      | ✅ Done        | —        | [id]/approve-branding/page.tsx                               |
| STORY-045 | 5      | ✅ Done        | —        | [id]/schedule-inspection + [id]/inspect/[id] pages           |
| STORY-046 | 3      | ⬜ Not Started | —        | Doc verification (deferred)                                  |
| STORY-047 | 5      | ✅ Done        | —        | [id]/generate-qr/page.tsx                                    |
| STORY-048 | 3      | ✅ Done        | —        | [id]/fleet-change/page.tsx                                   |
| STORY-049 | 3      | ✅ Done        | —        | [id]/issue-permit/page.tsx                                   |
| STORY-050 | 3      | ✅ Done        | —        | [id]/initiate-renewal/page.tsx                               |
| STORY-051 | 5      | ✅ Done        | —        | fleet-operators/page.tsx (list) + [id]/page.tsx (detail hub) |

**Files created:** `app/actions/mass-transit.ts`, `app/(dashboard)/fleet-operators/` (12 pages)  
**Sidebar:** `/mass-transit` → `/fleet-operators` (updated)  
**Blockers:** STORY-046 doc verification awaiting EPIC-004 Paystack for payment receipt uploads  
**Next Steps:** Resume EPIC-002 testing; begin EPIC-004 (Paystack integration) when ready

---

#### EPIC-004: Paystack Integration & Revenue Module

**Status:** � Complete | **Progress:** 100% (10/11 stories — STORY-068 planned)

| Story     | Points | Status     | Assignee | Notes                                                               |
| --------- | ------ | ---------- | -------- | ------------------------------------------------------------------- |
| STORY-060 | 3      | ✅ Done    | AI       | `lib/paystack.ts` API client, HMAC helpers                          |
| STORY-061 | 5      | ✅ Done    | AI       | Payment init + pay pages (motor-park & fleet-op)                    |
| STORY-062 | 3      | ✅ Done    | AI       | `/payment/callback` redirect handler                                |
| STORY-063 | 5      | ✅ Done    | AI       | `POST /api/webhooks/paystack` — HMAC-SHA512 validation              |
| STORY-064 | 3      | ✅ Done    | AI       | Receipt HTML generation, `PaymentReceipt` record, iframe preview    |
| STORY-065 | 5      | ✅ Done    | AI       | Finance dashboard `/payments` with filters + pagination             |
| STORY-066 | 3      | ✅ Done    | AI       | Arrears page `/payments/arrears` — overdue fee tracking             |
| STORY-067 | 5      | ✅ Done    | AI       | Revenue report `/payments/revenue` — KPIs + by-type + monthly trend |
| STORY-068 | 2      | 🔵 Planned | —        | PayDirect integration — awaiting Ministry Finance specs             |
| STORY-069 | 5      | ✅ Done    | AI       | Refund workflow `/payments/[id]/refund` — Finance Officer only      |
| STORY-070 | 3      | ✅ Done    | AI       | Audit trail via `Payment` records; webhook idempotency              |

**Files Created (EPIC-004):**

- `lib/paystack.ts` — server-only API client
- `app/actions/payments.ts` — all payment server actions
- `app/api/webhooks/paystack/route.ts` — webhook handler
- `app/(dashboard)/payment/callback/page.tsx` — post-Paystack redirect
- `app/(dashboard)/motor-parks/[id]/pay/page.tsx` — motor park fee payment
- `app/(dashboard)/fleet-operators/[id]/pay/page.tsx` — transit registration payment
- `app/(dashboard)/payments/page.tsx` — Finance Officer payment dashboard
- `app/(dashboard)/payments/[id]/page.tsx` — payment detail + receipt preview
- `app/(dashboard)/payments/[id]/refund/page.tsx` — refund workflow
- `app/(dashboard)/payments/arrears/page.tsx` — arrears tracking
- `app/(dashboard)/payments/revenue/page.tsx` — revenue report

**Blockers:**

- 🔵 **STORY-068**: PayDirect integration specs still pending from Ministry Finance

**Next Steps:**

1. EPIC-005 (Admin Panel) or EPIC-006 (Notifications)
2. Obtain PayDirect specs to complete STORY-068 in a future sprint

---

#### EPIC-005: Ministry Admin Panel

**Status:** ✅ Complete | **Progress:** 100% (11/11 stories)

| Story     | Points | Status      | Assignee | Notes                                          |
| --------- | ------ | ----------- | -------- | ---------------------------------------------- |
| STORY-080 | 5      | ✅ Complete | Copilot  | Staff provisioning — users list + new + edit   |
| STORY-081 | 3      | ✅ Complete | Copilot  | Role management — edit form, toggle active     |
| STORY-082 | 3      | ✅ Complete | Copilot  | Checklist config — read-only view with items   |
| STORY-083 | 3      | ✅ Complete | Copilot  | Fee schedule — CRUD + activate/deactivate      |
| STORY-084 | 3      | ✅ Complete | Copilot  | Notification config via system config keys     |
| STORY-085 | 2      | ✅ Complete | Copilot  | SMS gateway — configurable via system config   |
| STORY-086 | 2      | ✅ Complete | Copilot  | Paystack config keys via system config         |
| STORY-087 | 5      | ✅ Complete | Copilot  | System monitoring — KPI cards + activity feed  |
| STORY-088 | 3      | ✅ Complete | Copilot  | Audit trail viewer — paginated, filterable     |
| STORY-089 | 5      | ✅ Complete | Copilot  | Data export — CSV download for 5 entity types  |
| STORY-090 | 3      | ✅ Complete | Copilot  | Data export (same implementation as STORY-089) |

**Files created:**

- `app/actions/admin.ts` — all EPIC-005 server actions
- `app/(dashboard)/admin/users/page.tsx` — staff directory
- `app/(dashboard)/admin/users/new/page.tsx` — provision staff form
- `app/(dashboard)/admin/users/[id]/page.tsx` + `edit-form.tsx` — edit/deactivate
- `app/(dashboard)/admin/audit/page.tsx` — audit trail (paginated + filtered)
- `app/(dashboard)/admin/fees/page.tsx` + `fee-client.tsx` — fee schedule management
- `app/(dashboard)/admin/checklists/page.tsx` — checklist template viewer
- `app/(dashboard)/admin/config/page.tsx` + `config-client.tsx` — system configuration (SYSTEM_ADMIN only)
- `app/(dashboard)/admin/monitoring/page.tsx` — system health KPI dashboard
- `app/(dashboard)/admin/export/page.tsx` — data export (CSV download, client-side)
- `app/(dashboard)/sidebar.tsx` — updated with 5 new admin nav items

**Notes:**

- STORY-068 (PayDirect) deferred — awaiting Ministry Finance specs
- `tsc --noEmit` passes with zero errors

---

#### EPIC-006: AVIR Module

**Status:** 🔴 Not Started | **Progress:** 0% (0/13 stories)

| Story     | Points | Status         | Assignee | Notes                          |
| --------- | ------ | -------------- | -------- | ------------------------------ |
| STORY-100 | 5      | ⬜ Not Started | —        | Domain model                   |
| STORY-101 | 8      | ⬜ Not Started | —        | AVIR form replication          |
| STORY-102 | 3      | ⬜ Not Started | —        | Accident initiation            |
| STORY-103 | 3      | ⬜ Not Started | —        | Vehicle details                |
| STORY-104 | 2      | ⬜ Not Started | —        | Insurance verification         |
| STORY-105 | 2      | ⬜ Not Started | —        | Police details                 |
| STORY-106 | 5      | ⬜ Not Started | —        | Mechanical assessment (before) |
| STORY-107 | 3      | ⬜ Not Started | —        | Mechanical assessment (after)  |
| STORY-108 | 3      | ⬜ Not Started | —        | VIO signature                  |
| STORY-109 | 5      | ⬜ Not Started | —        | Dashboard routing              |
| STORY-110 | 5      | ⬜ Not Started | —        | Police delivery                |
| STORY-111 | 5      | ⬜ Not Started | —        | Report generation              |
| STORY-112 | 2      | ⬜ Not Started | —        | Two-copy system                |

**Blockers:**

- ⚠️ **CRITICAL:** Nigeria Police (Motor Traffic Division) contact & AVIR delivery mechanism not yet confirmed
- Form must exactly replicate Government Form 0051 — obtain latest form by Week 1

**Next Steps:**

1. Obtain official AVIR Form 0051 from Ministry by Week 1
2. Contact Nigeria Police to confirm report delivery mechanism by Week 2
3. Start form replication (STORY-101) in Sprint 4 (Week 7)

---

#### EPIC-007: Notifications & Alerts

**Status:** 🔴 Not Started | **Progress:** 0% (0/8 stories)

| Story     | Points | Status         | Assignee | Notes                 |
| --------- | ------ | -------------- | -------- | --------------------- |
| STORY-120 | 3      | ⬜ Not Started | —        | Message templates     |
| STORY-121 | 5      | ⬜ Not Started | —        | SMS gateway           |
| STORY-122 | 3      | ⬜ Not Started | —        | Email service         |
| STORY-123 | 5      | ⬜ Not Started | —        | Queue & retry         |
| STORY-124 | 2      | ⬜ Not Started | —        | Recipient prefs       |
| STORY-125 | 3      | ⬜ Not Started | —        | SLA alerts            |
| STORY-126 | 3      | ⬜ Not Started | —        | Renewal reminders     |
| STORY-127 | 2      | ⬜ Not Started | —        | Payment notifications |

**Blockers:** Ministry IT SMS gateway provider not yet identified  
**Next Steps:** Get SMS gateway recommendation from Ministry IT by Week 1; start setup in Sprint 2

---

#### EPIC-008: Dashboard & Reporting (Phase 1)

**Status:** 🔴 Not Started | **Progress:** 0% (0/8 stories)

| Story     | Points | Status         | Assignee | Notes                    |
| --------- | ------ | -------------- | -------- | ------------------------ |
| STORY-130 | 5      | ⬜ Not Started | —        | Commissioner dashboard   |
| STORY-131 | 5      | ⬜ Not Started | —        | PS operational dashboard |
| STORY-132 | 5      | ⬜ Not Started | —        | HOD dashboard            |
| STORY-133 | 3      | ⬜ Not Started | —        | Inspector dashboard      |
| STORY-134 | 5      | ⬜ Not Started | —        | Finance dashboard        |
| STORY-135 | 3      | ⬜ Not Started | —        | Applicant dashboard      |
| STORY-136 | 2      | ⬜ Not Started | —        | Status badge             |
| STORY-137 | 3      | ⬜ Not Started | —        | Search/filter            |

**Blockers:** Depends on all Phase 1 modules (data available for dashboards)  
**Next Steps:** Build dashboards in parallel with module development; finalize in Sprint 5

---

## Critical Path & Dependencies

```
Sprint 1 (Foundation)
  ├─ STORY-001-005: Project setup → BLOCKS all other work
  ├─ STORY-006-009: Auth framework → BLOCKS all module work
  └─ STORY-002-003: Design system → BLOCKS all UI work

Sprint 2 (Motor Park)
  ├─ EPIC-002 (Motor Park) → independent after Sprint 1
  └─ EPIC-007 (Notifications) → starts in Sprint 2

Sprint 3 (Mass Transit & Payments)
  ├─ EPIC-004 (Paystack) → CRITICAL BLOCKER for Sprint 3
  ├─ EPIC-003 (Mass Transit) → depends on EPIC-004
  └─ EPIC-001 Foundation must be complete

Sprint 4 (AVIR)
  ├─ EPIC-006 (AVIR) → independent after Sprint 1
  └─ Depends on Nigeria Police contact confirmation

Sprint 5 (Admin & Pilot)
  ├─ EPIC-005 (Admin) → requires all modules for testing
  ├─ EPIC-008 (Dashboards) → requires data from all modules
  └─ User Acceptance Testing (UAT) prep
```

---

## Blocker & Risk Register

### CRITICAL BLOCKERS

| Blocker                         | Priority    | Owner                     | Impact                                       | Mitigation                                                    | Status         |
| ------------------------------- | ----------- | ------------------------- | -------------------------------------------- | ------------------------------------------------------------- | -------------- |
| **PayDirect Integration Specs** | 🔴 CRITICAL | Ministry Finance          | Payment module cannot be built               | Start with mock PayDirect API; integrate real specs in Week 3 | ⚠️ PENDING     |
| **Nigeria Police AVIR Routing** | 🔴 CRITICAL | Ministry / Nigeria Police | AVIR reports cannot be delivered to police   | Obtain contact + routing method (email/API/portal) by Week 2  | ⚠️ PENDING     |
| **Paystack Test Credentials**   | 🔴 CRITICAL | ISCE / Paystack           | Payment testing blocked                      | Request test keys by Week 1; use sandbox environment          | ⏳ IN PROGRESS |
| **Official AVIR Form 0051**     | 🟡 HIGH     | Ministry                  | AVIR form must exactly match government form | Obtain latest form copy by Week 1                             | ⏳ IN PROGRESS |

### HIGH-PRIORITY RISKS

| Risk                          | Likelihood | Impact   | Mitigation                                                      | Owner         |
| ----------------------------- | ---------- | -------- | --------------------------------------------------------------- | ------------- |
| Scope creep on UI components  | Medium     | Medium   | Freeze Phase 1 component specs by Week 2; add-ons go to Phase 3 | Product Lead  |
| Performance degrades at scale | Low        | High     | Load test by Week 13; index database proactively                | Backend Lead  |
| Security vulnerabilities      | Low        | Critical | Penetration test in Week 14; emergency patching in place        | Security Lead |
| Field inspector mobile issues | Medium     | Medium   | Test on Android & iOS weekly; establish mobile QA process       | Frontend Lead |
| Paystack webhook delays       | Low        | Medium   | Implement webhook retry + dead-letter queue                     | Backend Lead  |

---

## Weekly Standup Template

**Every Tuesday, 10:00 AM WAT**

```
Date: [Tuesday date]
Sprint: [Sprint N]
Week: [W1, W2, W3, ...]

COMPLETED LAST WEEK
- [STORY-XXX] [Story title] — DONE by [assignee]
- [STORY-XXX] [Story title] — DONE by [assignee]

IN PROGRESS THIS WEEK
- [STORY-XXX] [Story title] — 60% complete, [assignee]
- [STORY-XXX] [Story title] — 30% complete, [assignee]

BLOCKED / AT RISK
- [STORY-XXX] [Story title] — Blocked by [reason], owned by [person]
- [BLOCKER] [Blocker name] — Status, ETA

NEXT WEEK GOALS
- Target: [X] story points completed
- Focus: [Module or epic]
- Risks: [If any]

DECISIONS NEEDED
- [Question 1] → Owner, deadline
- [Question 2] → Owner, deadline
```

---

## Release Checklist — Phase 1 Pilot (Week 8)

### Code & Quality

- [ ] All Phase 1 stories marked DONE
- [ ] Code review complete (0 critical findings)
- [ ] Unit test coverage ≥80%
- [ ] Integration tests passing
- [ ] No console errors or warnings (staging)
- [ ] Lighthouse score ≥85

### Security & Performance

- [ ] Security audit passed (no critical vulnerabilities)
- [ ] Load test passed (99.5% uptime at 10x load)
- [ ] Secrets not exposed in code/logs
- [ ] Database backups tested & working
- [ ] Disaster recovery plan validated

### Documentation & Training

- [ ] User guides completed (one per role)
- [ ] Video tutorials recorded (key workflows)
- [ ] API documentation up-to-date
- [ ] Database schema documented
- [ ] Deployment runbook ready

### Ministry Preparation

- [ ] Ministry staff accounts provisioned
- [ ] Test data loaded (5 test cases per module)
- [ ] Commissioner/PS trained on approval workflows
- [ ] HODs trained on inspection scheduling
- [ ] Field inspectors trained on mobile forms
- [ ] Finance team trained on payment reconciliation

### Launch Readiness

- [ ] Go/No-Go decision by Week 8 Friday
- [ ] Pilot user list confirmed (20–30 Ministry staff)
- [ ] Incident response team on call (24/7)
- [ ] Paystack production account ready
- [ ] PayDirect account linked and tested
- [ ] Backup & restore procedures tested

---

## Velocity Tracking

| Sprint            | Planned Points | Completed Points | Velocity | Forecast                     |
| ----------------- | -------------- | ---------------- | -------- | ---------------------------- |
| Sprint 1          | 45             | 50 (🔄 active)   | —        | —                            |
| Sprint 2          | 50             | —                | —        | —                            |
| Sprint 3          | 65             | —                | —        | —                            |
| Sprint 4          | 40             | —                | —        | —                            |
| Sprint 5          | 45             | —                | —        | —                            |
| **Phase 1 Total** | **245**        | **50**           | —        | **12 weeks (if 20 pt/week)** |

---

## Document Maintenance

**Update this file:**

- Every Friday (end of week summary)
- After each standup (status updates)
- When blockers are identified or resolved
- When story status changes (In Progress → Done)

**Owner:** Product Lead  
**Last Updated:** April 23, 2026 — Design system complete (STORY-002/003); 8 stories done (50 pts); foundation + auth + UI library live
**Next Update:** April 25, 2026 (End of Sprint 1 Week 1)

---

**Status Legend:**

- 🟢 On Track
- 🟡 At Risk
- 🔴 Off Track / Blocked
- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
