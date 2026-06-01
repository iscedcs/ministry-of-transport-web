# Weekly Project Report

**Reporting Period:** May 11–15, 2026
**Prepared by:** Fusco
**Date:** May 15, 2026

---

## Overview

This document is the weekly status report for the Ministry of Transport platform covering May 11–15, 2026. The primary activity this week was requirements capture and stabilization work focused on Motor Parks and Mass Transit features. An extensive review meeting on May 14–15 produced a prioritized set of corrections and enhancements (recorded below) to be groomed into implementation work.

---

## Project: Ministry of Transport Platform

1. **Project Name:** Ministry of Transport Platform — Next.js transport services portal
2. **Objective / Scope:** Public portal and admin dashboard for motor park registration, inspection, and Mass Transit terminal management.
3. **Current Phase:** Requirements capture, stabilization, and prioritization for Motor Park corrections.

### This Week (11–15 May) — Summary

- Conducted review and requirements sessions (May 14–15) with stakeholders to capture corrections and new requirements for Motor Parks and Mass Transit.
- Performed light stabilization and follow-up validation from earlier layout/responsiveness fixes.
- Prioritized changes for the next sprint; prepared a consolidated list of form, data, role, and workflow corrections.

### Key Outcomes

- Decision to replace the "application letter" flow with account-based owner registration.
- Owner registration will capture personal (owner) information (not company) and require phone number and personal address.
- Application form address fields split into `Street address`, `LGA`, and `Town/City`.
- Mandatory document uploads before application submission (including corporate asin certificate and infrastructure photos).
- Expanded amenities checklist to include water supply, street/security lighting, and CCTV/camera.
- Persist inspector checklist state across refreshes; add proximity suggestions and approximate distances to major intersections.
- Roles and permissions clarified (Commissioner → PS → HOD → Inspector) and Commissioner/HOD/PS action scopes noted.

---

## What We Intend To Do Next (MOT MOTOR PARK CORRECTIONS)

The following is the consolidated, implementable list derived from the May 14–15 review. These items will be broken into grooming-ready tickets and implemented across UI, API, and DB schema as required.

1. Owner onboarding and application flow
   - Remove the requirement for an "Application letter from the intending private Park Owner".
   - Implement account-based owner registration: `create account as owner` then proceed to "New Application" form.
   - On registration, collect personal owner information (not company): `firstName`, `lastName`, `phoneNumber`, `personal/residential address`.
   - Ensure `phoneNumber` is validated and stored as the primary contact.

2. Application form / Park Location / Park Manager
   - Application form: treat company info as `Company asin` (separate field) when applicable.
   - Park Location: split into `Street address`, `LGA`, and `Town/City` instead of a single full-address field.
   - Park Manager record: expand to include `residential address` and `next of kin` (optional).

3. Documents and infrastructure uploads
   - Require upload of `corporate asin certificate` and facility infrastructure photos (toilet, waiting area, signage, etc.).
   - Provide upload UI and endpoint; canonical upload path reference: `/motor-parks/{id}/upload-documents` (example: https://ministry-of-transport-web.vercel.app/motor-parks/cmp5i4sat0009swfduxu27eum/upload-documents).
   - Uploaded documents must appear on the park dashboard for HOD review and action.
   - Make document upload compulsory before application submission.

4. Dashboard & document review
   - Add "Uploaded Documents" area on park dashboard visible to HODs and PS; HODs should be able to mark documents as reviewed and add comments.

5. Access control & inspector model
   - Break inspector access into two flags/levels: `access` and `inspector` to control UI/permissions granularity.
   - Ensure the inspector `Inspection Checklist` state is persisted server-side and does not clear on page refresh.

6. Amenities & site characteristics
   - Expand amenities checklist with explicit fields: `street light / security light`, `camera / CCTV`.
   - Add `Approximate distance` calculation / suggestion for park proximity to major road intersections; include an option to mark "too close" to sensitive intersections.

7. Fees, levies and payments
   - Allow HOD and PS to record fees/levies; ensure `inspection fee` is included as part of levy recording.
   - Application flow: charge `application fee` on submission; after payment allow scheduling of inspection.

8. Roles & actions
   - Roles hierarchy: Commissioner creates PS; PS creates HOD; HOD creates Inspectors.
   - Commissioner actions: view all approved motor parks; search registered motor parks by LGA or town; total parks per company; temporal approvals (grant temporary approval action).
   - HOD/PS actions: review documents; record fees/levies; validate inspections.

9. Mass Transit
   - Include owner information in Mass Transit forms and motor park entries where applicable.
   - Terminal model: require `terminal manager` for each terminal; terminal manager field becomes compulsory.

10. Additional UX/validation
    - Require mandatory document uploads before allowing final application submission.
    - Maintain inspector checklist state on refresh and support partial saves.

---

## Next Steps / Implementation Plan (high-level)

- Groom and break the above items into story-sized tickets (backend schema, API endpoints, UI forms, validations, and tests).
- Prioritise: (1) Owner registration + mandatory documents, (2) Address field split + amenities, (3) Persist checklist + inspector access flags, (4) Fees and payment flow changes.
- Prepare DB migration plan for new personal address fields and document references.
- Schedule implementation across upcoming sprint(s) and assign to engineering.

---

## Blockers / Dependencies

- None
