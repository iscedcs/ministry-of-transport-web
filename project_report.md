Listed directory ministry-of-transport
Viewed README.md:1-37
Viewed package.json:1-56
Listed directory docs
Viewed .env.example:1-59
Listed directory app
Listed directory lib
Listed directory api
Listed directory actions
Listed directory prisma
Viewed db.ts:1-40
Viewed .env:1-13
Viewed INDEX.md:1-332
Viewed services-data.ts:1-86
Viewed motor-park.ts:1-800
Viewed ARCHITECTURE.md:1-571
Searched for "TODO"
Searched for "IISCE"
Searched for "isce"
Searched for "todo"
Viewed next.config.ts:1-35
Viewed sidebar.tsx:1-334
Searched for "isce"
Searched for "TODO|FIXME|stub|mock"
Searched for "TODO|FIXME|stub|mock"
Searched for "TODO|FIXME|stub|mock"
Searched for "mock|fallback|dummy|sample"
Listed directory %28dashboard%29
Listed directory %28public%29
Listed directory %28auth%29
Listed directory admin
Viewed PROGRESS.md:1-496
Viewed Weekly%20Project%20Report%20-%20May%2011%20-%20May%2015,%202026.md:1-102

Here is the comprehensive project brief for the **Ministry of Transport, Anambra State (MOT Anambra)** platform, based strictly on evidence gathered from the repository’s source code, configuration files, schema definitions, and internal documentation.

---

# MOT Anambra — Project Brief

### 1. ONE-LINE SUMMARY
An integrated, full-stack Next.js transport services automation and regulatory portal for the Ministry of Transport, Anambra State (MOT Anambra), designed to digitize motor park licensing, mass transit onboarding, vehicle inspection workflows, and statewide revenue collection.

---

### 2. OBJECTIVE / PROBLEM IT SOLVES
* **Problem Addressed:** The platform replaces fragmented, manual, paper-based transport administrative processes with a centralized digital system. It provides a single source of truth for transport regulatory workflows, physical site evaluations, licensing, compliance tracking, and fee reconciliation.
* **Target Users & Stakeholders:**
  * **Government Regulators & Administrators:** Commissioner of Transport, Permanent Secretary (PS), Heads of Department (HODs), and Field Inspectors (Vehicle Inspection Officers [VIO/VIS] and Park Monitoring teams).
  * **Private Transport Operators:** Private Motor Park owners, Park Managers, and Mass Transit / Fleet Operator companies.
  * **General Public & Commuters:** Citizens accessing verified transport services and verification portals (e.g., QR-code permit verification via `/verify`).

---

### 3. KEY FEATURES OR MODULES
* **Motor Park Licensing Module (`/motor-parks`, `/app/actions/motor-park.ts`):** **Fully Implemented.** Supports application submission (FR-010), document uploads (CAC certificate, land ownership docs), inspection scheduling, 3-factor proximity evaluation, Permit to Build (PTB) issuance, re-inspection requests, fee assessment, final approval letters, and annual revalidation workflows.
* **Mass Transit & Fleet Operator Module (`/fleet-operators`, `/app/actions/mass-transit.ts`):** **Fully Implemented.** Handles company onboarding, multi-vehicle fleet declaration, driver card issuance, branding approvals, terminal manager assignment, inspection scheduling, QR code generation, and renewal workflows.
* **Revenue & Payments Module (`/payments`, `/payment`, `/app/actions/payments.ts`, `lib/paystack.ts`):** **Fully Implemented.** Features payment initialization via Paystack, callback redirection, webhook HMAC-SHA512 validation (`/api/webhooks/paystack`), printable HTML receipt generation, finance officer dashboards, arrears tracking, and refund workflows.
* **Ministry Admin & Governance Panel (`/admin/*`, `/app/actions/admin.ts`):** **Fully Implemented.** Provides staff user provisioning across 7 role tiers, role management, fee schedule CRUD, system monitoring KPIs, audit trail viewing, and CSV data exports.
* **Executive & Operational Dashboards (`/dashboard`, `/app/actions/executive-dashboard.ts`):** **Implemented with Fallback Shells.** Uses real database aggregation queries for operational metrics and KPIs, but incorporates explicit mock/fallback structures for visual line charts when historical SQL aggregation is unavailable or records are empty (`// Mock Data`, `// Use real data if available, fallback to mock data`).
* **Public & Verification Portals (`/verify`, `/services`, `/apply-park-monitor`):** **Implemented.** Public UI routes for service discovery, park monitor applications, and permit verification.
* **AVIR (Accident Vehicle Inspection Report) Module (EPIC-006):** **Unstarted / Shell.** Documented in `PROGRESS.md` as 0% complete; awaiting external routing confirmation from the Nigeria Police Force.
* **Notifications & Alerts Module (EPIC-007):** **Unstarted / Placeholder.** Documented as 0% complete; currently represented by placeholder TODOs in server actions (`// TODO: [STORY-031] Integrate with background job / notification queue when available`).
* **Extended Services (VIS Intake, Driving Schools, Towing & Dispatch):** **Planned.** Documented in the Phase 2 roadmap (Weeks 9–14) but not yet present in code.

---

### 4. TECH STACK
* **Framework:** Next.js 16.0.0-canary.13 (App Router, React Server Components, and Server Actions).
* **Language:** TypeScript 5.x (with `tsx` for execution scripts).
* **UI Library & Components:** React 19.0.0-rc, Radix UI headless primitives (`@radix-ui/react-*`), Lucide React icons, and custom components built on the `shadcn/ui` architecture.
* **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, `@theme inline` with an OKLCH color token system defined in `app/globals.css`), `clsx`, and `tailwind-merge`.
* **Database & ORM:** PostgreSQL hosted on Neon Serverless (`@neondatabase/serverless`), accessed via Prisma ORM v7 (`@prisma/client`, `@prisma/adapter-neon`, `prisma` v7.8.0).
* **Form Handling & Validation:** React 19 hooks (`useActionState`, `useFormStatus`), React Hook Form v7.54.2, `@hookform/resolvers` v3.10.0, and Zod v3.24.1.
* **Authentication & Security:** Custom JWT session management using `jose` v6.2.2 (encrypted HTTP-only cookies with a 7-day sliding expiration) and `bcryptjs` v3.0.3 for password hashing. Route guarding is enforced via Next.js Edge Middleware (`middleware.ts`).
* **Testing & Build Tooling:** ESLint 9 (`eslint-config-next`), PostCSS, and `pnpm`.

---

### 5. BACKEND DEPENDENCY STATUS
* **CONFIRMED STATUS: FULL-STACK MONOLITH WITH EMBEDDED BACKEND (NOT FRONTEND-ONLY).**
* **Verification Details:** Contrary to the assumption that this repository is a pure frontend without a backend, the codebase contains a completely integrated, self-contained backend layer:
  * **No External API Client Standing In:** There is no client code fetching from an external REST/GraphQL server, nor are there `.env` variables pointing to a separate backend URL. 
  * **Server Actions Architecture:** As documented in `docs/ARCHITECTURE.md` (*"NO EXTERNAL BACKEND — All business logic runs in Next.js Server Actions"*), the application utilizes Next.js Server Actions (`app/actions/*.ts`) as its backend controller layer.
  * **Database Schema & ORM:** `prisma/schema.prisma` contains 26 PostgreSQL relational tables (`MotorPark`, `MassTransitCompany`, `Inspection`, `Payment`, `AuditLog`, `User`, etc.) and 9 enums. `lib/db.ts` instantiates a live connection pool to Neon Serverless PostgreSQL.
  * **Data Handling:** The system executes live queries, mutations, role-based Row Level Security (RLS) enforcement (`lib/server-actions-pattern.ts`), transaction auditing, and cryptographic session management directly against the database. Mock data is restricted solely to chart rendering fallbacks when historical analytics records are empty.

---

### 6. DEPENDENCIES ON OTHER SYSTEMS
* **Paystack (`lib/paystack.ts`):** Active integration for payment processing, transaction verification, and webhook notifications (validating HMAC-SHA512 signatures in `app/api/webhooks/paystack/route.ts`).
* **SendGrid (`SENDGRID_API_KEY` in `.env.example`):** Referenced for transactional email notifications.
* **Termii (`TERMII_API_KEY`, `TERMII_SENDER_ID` in `.env.example`):** Referenced as the Nigerian SMS gateway provider for SMS alerts.
* **AWS S3 / DigitalOcean Spaces (`AWS_*` vars in `.env.example`):** S3-compatible cloud storage required for uploading inspection photos, land ownership documents, and CAC certificates.
* **Sentry (`NEXT_PUBLIC_SENTRY_DSN` in `.env.example`):** Configured for application error tracking and performance monitoring.
* **PayDirect (External Government System):** Documented in `PROGRESS.md` as an external revenue integration (STORY-068), currently blocked awaiting integration specifications from Ministry Finance.
* **Nigeria Police Force (Motor Traffic Division):** Documented external routing target required for receiving AVIR Form 0051 accident reports.
* **Transpay:** Documented existing electronic toll/revenue system requiring validation signals from the portal.

---

### 7. CURRENT STATE OF DEVELOPMENT
* **Overall Assessment:** **Active Development / Phase 1 Complete (Near Phase 1 Pilot Readiness).**
* **Progress Evidence:** The application is far beyond a prototype. According to `docs/PROGRESS.md`, Phase 1 foundation epics are substantially finished: EPIC-001 (Foundation & Auth) is at 80%, EPIC-002 (Motor Parks) is at 100%, EPIC-003 (Mass Transit) is at 92%, EPIC-004 (Paystack & Revenue) is at 100%, and EPIC-005 (Admin Panel) is at 100%.
* **Indicators of In-Progress & Missing Work:**
  * **Unstarted Epics:** EPIC-006 (AVIR Module) and EPIC-007 (Notifications & Alerts) sit at 0% completion.
  * **Code TODOs:** Explicit developer stubs remain, such as in `app/actions/motor-park.ts`: `// TODO: [STORY-031] Integrate with background job / notification queue when available`.
  * **Active Refinement Cycles:** `Weekly Project Report - May 11 - May 15, 2026.md` outlines an active sprint grooming list to overhaul forms (splitting address fields into Street/LGA/Town, replacing application letters with account-based owner onboarding, and making CAC/photo uploads mandatory prior to submission).

---

### 8. NOTABLE DATES
* **April 2026:** Official project kickoff and Phase 1 foundation launch (referenced across `PROGRESS.md` and documentation updates from April 23 and April 25, 2026).
* **May 4, 2026:** Last `feat:` commit timestamp referenced by build scripts (`next.config.ts` dynamically executes `git log` to inject `NEXT_PUBLIC_LAST_UPDATED` into the application footer).
* **May 11–15, 2026:** Date range of the most recent requirements capture, stakeholder review meetings, and weekly status report (`Weekly Project Report - May 11 - May 15, 2026.md`).
* **June 29 – July 3, 2026:** Timestamps referenced in conversation logs and progress reports regarding revalidation queue enhancements and MDA management implementations.
* **Week 8 Milestone (Target: June/July 2026):** Tracked in `PROGRESS.md` as the target date for the "Phase 1 Pilot" deployment with 20–30 Ministry staff.
* **Weeks 9–16 Roadmap:** Extended services (VIS, Driving Schools, Towing) scheduled for Weeks 9–14, followed by Post-Launch planning in Weeks 15–16.

---

### 9. STAKEHOLDER OR CLIENT REFERENCES
* **Ministry of Transport, Anambra State (MOT Anambra):** Primary government client and regulatory body. Coded user roles reflect their administrative hierarchy: Commissioner, Permanent Secretary (PS), Heads of Department (HODs), and Field Inspectors (VIO/VIS).
* **ISCE Digital Concept (also referenced as ISCE / IISCE):** The technical developer, engineering contractor, and Public-Private Partnership (PPP) operator building and hosting the platform (referenced in `PROGRESS.md`, `.env.example`, and developer documentation).
* **Ministry Finance & Ministry IT:** Internal state government stakeholder departments tasked with providing PayDirect integration specs and SMS gateway approvals.
* **Nigeria Police Force (Motor Traffic Division):** External statutory stakeholder involved in accident reporting (AVIR).
* **Named Contributors:** Mentioned in internal reports and trackers, including **"Fusco"** (author of weekly progress reports) and automated development assignees (**"Agent"**, **"Copilot"**, **"AI"**).

---

### 10. OPEN ISSUES / KNOWN GAPS
* **PayDirect Integration Specs (`🔴 CRITICAL BLOCKER`):** Story STORY-068 is deferred and blocked pending technical specifications from Ministry Finance.
* **Nigeria Police AVIR Routing (`🔴 CRITICAL BLOCKER`):** Contact person, data format, and delivery mechanism (email, API, or portal) remain unconfirmed with the police department, preventing start of EPIC-006.
* **Official AVIR Form 0051 (`🟡 HIGH PRIORITY`):** Engineering requires an official physical/digital copy of Government Form 0051 from the Ministry to accurately replicate the accident reporting schema.
* **SMS Gateway Selection:** Awaiting Ministry IT recommendation on whether to use Termii or another state-approved provider for queue-based SMS notifications (blocking EPIC-007).
* **Pending UI/UX & Schema Corrections (Groomed from May 14–15 Review):**
  * Migration from static "application letter" uploads to account-based personal owner onboarding (`firstName`, `lastName`, `phoneNumber`, `personal address`).
  * Splitting single location strings into structured `Street address`, `LGA`, and `Town/City` fields across database models and forms.
  * Enforcing mandatory document uploads (CAC certificates and site infrastructure photos) *before* allowing application submission.
  * Persisting inspector checklist evaluations server-side across browser refreshes and implementing proximity distance evaluations to major road intersections.