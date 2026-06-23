# Park Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Park Monitor" application flow, role, review process, and ID card issuance feature.

**Architecture:** 
1. Database changes to support the new `PARK_MONITOR` role and `ParkMonitorApplication` model.
2. A multi-step (or long) form for `EXTERNAL_APPLICANT` to apply as a Park Monitor.
3. Review process for `COMMISSIONER` to APPROVE, REJECT, or WAITLIST applications.
4. Dashboard integration for approved applicants to upload their photo, pay the ID Card fee via Paystack, and claim their ID.
5. HOD review of the payment and photo to issue the final ID card with a generated unique URL and QR Code.

**Tech Stack:** Next.js Server Actions, Prisma, Paystack, DigitalOcean Spaces for photo uploads, React Hook Form/Zod for validation.

---

### Task 1: Database Schema Updates

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts` (optional, for test data)

- [ ] **Step 1: Update Enums**
  Add `PARK_MONITOR` to `UserRole`.
  Add `WAITLISTED` to `ApplicationStatus`.

- [ ] **Step 2: Add `ParkMonitorApplication` Model**
  Add the new model capturing all fields from `docs/PARK MONITOR.md`.
  Include relations for documents, applicant (`User`), and payment.

- [ ] **Step 3: Generate and Push**
  Run `npx prisma generate` and `npx prisma db push`.

### Task 2: Upload Mechanism Improvements

**Files:**
- Modify: `app/api/upload/route.ts`
- Modify: `app/actions/upload.ts`
- Modify: `lib/spaces.ts`

- [ ] **Step 1: Make Upload Generic**
  Update the `/api/upload` route to accept `linkedToType` and `documentType` via FormData so it can handle `PARK_MONITOR_APP` documents.

- [ ] **Step 2: Add Photo Upload Function**
  Add an upload function specific to the `DO_SPACES_STORAGE_PREFIX=mot-anambra-park-monitor-images` requirement for ID Card photos.

### Task 3: Park Monitor Application Form

**Files:**
- Create: `app/(dashboard)/park-monitor/apply/page.tsx`
- Create: `app/actions/park-monitor.ts`

- [ ] **Step 1: Create Server Actions**
  Implement `submitParkMonitorApplication` in `app/actions/park-monitor.ts`.

- [ ] **Step 2: Build the Form UI**
  Build the React form in `app/(dashboard)/park-monitor/apply/page.tsx` covering all sections (Biodata, Education, Employment, Health, Character, Suitability, References, Next of Kin).


this form should be created as component and called in the page 

### Task 4: Commissioner Review Workflow

**Files:**
- Create/Modify: `app/(dashboard)/admin/park-monitors/page.tsx`
- Modify: `app/actions/park-monitor.ts`

- [ ] **Step 1: Review Action**
  Implement `reviewParkMonitorApplication(id, status, notes)` in actions.

- [ ] **Step 2: Admin Dashboard View**
  Build a page for the Commissioner to view pending applications and APPROVE/REJECT/WAITLIST them.

### Task 5: ID Card Claim Process (Applicant Dashboard)

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx` (or equivalent external applicant dashboard)
- Create: `app/(dashboard)/park-monitor/claim-id/page.tsx`

- [ ] **Step 1: Dashboard Status**
  Display the application status on the applicant's dashboard. If APPROVED, show "Claim Your ID" button.

- [ ] **Step 2: Claim ID Form (Photo & Payment)**
  Build a page where the applicant uploads a passport photo and proceeds to pay the 20,000 NGN fee via Paystack.

- [ ] **Step 3: Payment Integration**
  Ensure the Paystack webhook (`app/api/webhooks/paystack/route.ts`) handles the `PARK_MONITOR_ID` payment type and updates the application.

### Task 6: HOD ID Card Issuance

**Files:**
- Create: `app/(dashboard)/admin/park-monitors/issue/page.tsx`
- Modify: `app/actions/park-monitor.ts`

- [ ] **Step 1: HOD Dashboard View**
  Show applications that are APPROVED and have completed payment.

- [ ] **Step 2: Issue Action**
  Implement the action to generate the URL, generate a QR Code, update the application to "ID_ISSUED", and change the applicant's role from `EXTERNAL_APPLICANT` to `PARK_MONITOR`.

- [ ] **Step 3: Applicant Final View**
  Update the applicant dashboard to show "Payment Confirmed. Pick up your ID from HOD Office."
