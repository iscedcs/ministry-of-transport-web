# Epics & Stories — Ministry of Transport Platform

**Feature Breakdown for Development & Sprint Planning**

---

## Epic Hierarchy

**Format:**

```
EPIC-XXX: Epic Name
├─ STORY-XXX: Story Title (points: X)
├─ STORY-XXX: Story Title (points: X)
└─ ...
```

Points follow Fibonacci scale: 1, 2, 3, 5, 8, 13, 21  
**T-shirt:** XS=1–2, S=3, M=5–8, L=13, XL=21

---

## PHASE 1: Core Platform (Weeks 1–8)

### EPIC-001: Foundation & Authentication

_Build project infrastructure, design system, and auth framework_

- **STORY-001:** Project scaffolding (Next.js 15, Tailwind, TypeScript, Prisma) — Points: **8**
- **STORY-002:** Design token system (OKLCH colors, typography, spacing, radius, motion) — Points: **5**
- **STORY-003:** Base UI component library (Button, Input, Select, Card, Modal, etc.) — Points: **8**
- **STORY-004:** Database schema design (Prisma) for Phase 1 entities — Points: **8**
- **STORY-005:** Deploy database to Neon (staging + production) — Points: **5**
- **STORY-006:** Authentication framework (Ministry staff role-based, external ASIN) — Points: **8**
- **STORY-007:** User registration & login flows — Points: **5**
- **STORY-008:** Password reset & 2FA setup (email OTP) — Points: **5**
- **STORY-009:** Environment configuration (.env variables, secrets management) — Points: **3**
- **STORY-010:** CI/CD pipeline (GitHub Actions, automated tests) — Points: **5**

**Epic Acceptance Criteria:**

- [ ] UI component library complete with storybook/visual tests
- [ ] Database deployed to Neon; all Phase 1 tables created
- [ ] Authentication working for both Ministry staff and external applicants
- [ ] All environment variables documented in .env.example

---

### EPIC-002: Motor Park Module

_Enable park owners to apply for approval; Ministry team to inspect and approve_

**Related PRD Functional Requirements:** FR-010 through FR-019

- **STORY-020:** Motor Park domain model & database schema — Points: **5**
- **STORY-021:** Park application form (online submission) — Points: **5**
- **STORY-022:** Document upload component (CAC, land docs, etc.) — Points: **3**
- **STORY-023:** Inspection scheduling UI (HOD Parks assigns to field inspector) — Points: **5**
- **STORY-024:** Inspection checklist form (parking, conveniences, fire extinguishers, etc.) — Points: **5**
- **STORY-025:** Inspection report submission & approval workflow — Points: **5**
- **STORY-026:** "Permit to Build" issuance (Commissioner/PS sign-off) — Points: **3**
- **STORY-027:** Re-inspection workflow (after park construction) — Points: **5**
- **STORY-028:** Proximity evaluation form (distance to public park, major road, intersection) — Points: **3**
- **STORY-029:** Motor Park Fee/Levy assessment & recording — Points: **3**
- **STORY-030:** Digital approval letter generation & download — Points: **3**
- **STORY-031:** Annual revalidation reminder workflow — Points: **3**
- **STORY-032:** Permit revocation workflow — Points: **3**
- **STORY-033:** Park status dashboard & tracking — Points: **5**

**Epic Acceptance Criteria:**

- [ ] Park applicant can submit complete application with all required docs
- [ ] HOD Parks can schedule inspection and assign to field inspector
- [ ] Field inspector can enter inspection findings on mobile device
- [ ] Commissioner can issue or deny "Permit to Build"
- [ ] Park owner receives status notifications at each stage
- [ ] Annual revalidation reminder triggered 60 days before expiry

---

### EPIC-003: Mass Transit & Fleet Operator Module

_Enable transit companies to register; manage fleet vehicles and permits_

**Related PRD Functional Requirements:** FR-020 through FR-030

- **STORY-040:** Mass Transit domain model & database schema (company, vehicles, drivers) — Points: **5**
- **STORY-041:** Mass Transit application form (company details, fleet declaration) — Points: **5**
- **STORY-042:** Fleet vehicle list management (min. 5 vehicles validation) — Points: **3**
- **STORY-043:** Driver proficiency card tracking — Points: **3**
- **STORY-044:** Colour/branding approval workflow — Points: **3**
- **STORY-045:** Terminal/depot inspection routing (within 5-day SLA) — Points: **5**
- **STORY-046:** Document verification checklist — Points: **3**
- **STORY-047:** QR code generation & assignment per vehicle — Points: **5**
- **STORY-048:** Fleet change notifications (add/remove vehicles) — Points: **3**
- **STORY-049:** "Permit to Operate" certificate issuance — Points: **3**
- **STORY-050:** Annual renewal workflow — Points: **3**
- **STORY-051:** Mass Transit company dashboard (fleet view, permit status) — Points: **5**

**Epic Acceptance Criteria:**

- [ ] Mass Transit company can submit application with ≥5 vehicles
- [ ] Inspection team receives routing and completes inspection within 5 days
- [ ] All documents verified before approval
- [ ] QR codes generated and assigned to each vehicle
- [ ] Company receives "Permit to Operate" certificate upon approval
- [ ] Annual renewal reminder triggered 60 days before expiry

---

### EPIC-004: Paystack Integration & Revenue Module

_Integrate payment processing; track all fees through platform_

**Related PRD Functional Requirements:** FR-040 through FR-044

- **STORY-060:** Paystack API client setup & environment variables — Points: **3**
- **STORY-061:** Payment request initialization (Paystack charge endpoint) — Points: **5**
- **STORY-062:** Checkout page (redirect to Paystack) — Points: **3**
- **STORY-063:** Payment verification webhook (Paystack → platform) — Points: **5**
- **STORY-064:** Digital receipt generation (HTML + PDF) — Points: **3**
- **STORY-065:** Payment tracking & reconciliation dashboard (Finance Officer) — Points: **5**
- **STORY-066:** Arrears tracking & overdue payment alerts — Points: **3**
- **STORY-067:** Monthly revenue report generation (breakdown by service type) — Points: **5**
- **STORY-068:** PayDirect integration planning (API specs TBD) — Points: **2**
- **STORY-069:** Refund workflow (initiated by Finance Officer, approved by HOD) — Points: **5**
- **STORY-070:** Payment audit trail (all transactions logged) — Points: **3**

**Epic Acceptance Criteria:**

- [ ] Park owner can pay application fee via Paystack checkout
- [ ] Payment confirmation webhook received and processed
- [ ] Digital receipt generated and sent via email
- [ ] Finance Officer can view all transactions and generate monthly report
- [ ] Refund initiated for failed/duplicate payments through platform

**Paystack Integration Notes:**

- Secret key stored in `.env.local` (never exposed to client)
- Public key safe for frontend Popup/InlineJS
- All amounts in kobo (multiply by 100)
- Transaction ID stored as string (unsigned 64-bit in Paystack)
- See `docs/PAYSTACK_INTEGRATION.md` for detailed setup

---

### EPIC-005: Ministry Admin Panel

_Provide internal tools for staff account management, configuration, and monitoring_

- **STORY-080:** Staff user provisioning interface (Permanent Secretary) — Points: **5**
- **STORY-081:** Role assignment & permission management — Points: **3**
- **STORY-082:** Inspection checklist configuration (admin can add/edit/delete items) — Points: **3**
- **STORY-083:** Fee schedule management (set park fees, registration fees, renewal fees) — Points: **3**
- **STORY-084:** Email template configuration (approval letter, reminders, alerts) — Points: **3**
- **STORY-085:** SMS gateway configuration (provider selection, credentials) — Points: **2**
- **STORY-086:** Paystack account linking & test mode toggle — Points: **2**
- **STORY-087:** System monitoring dashboard (uptime, API response times, error rates) — Points: **5**
- **STORY-088:** Audit trail viewer (immutable log of all user actions) — Points: **3**
- **STORY-089:** Backup & restore functionality — Points: **5**
- **STORY-090:** Data export tools (CSV, Excel) — Points: **3**

**Epic Acceptance Criteria:**

- [ ] Permanent Secretary can create/edit/delete Ministry user accounts
- [ ] Inspection checklists customizable per HOD
- [ ] Fee schedules updatable without code deployment
- [ ] Email templates editable via admin interface
- [ ] System monitoring dashboard shows real-time uptime/performance
- [ ] Audit log searchable by user, date, action type

---

### EPIC-006: Accident Vehicle Inspection Report (AVIR) Module

_Enable vehicle inspection officers to file accident reports; route to police & MOT_

**Related PRD Functional Requirements:** FR-070 through FR-081

- **STORY-100:** AVIR domain model & database schema — Points: **5**
- **STORY-101:** AVIR form replication (match Government Form 0051 exactly) — Points: **8**
- **STORY-102:** Accident report initiation workflow (driver, police, public) — Points: **3**
- **STORY-103:** Vehicle particulars capture (make, engine #, chassis #, classification) — Points: **3**
- **STORY-104:** Insurance verification step — Points: **2**
- **STORY-105:** Police officer details capture — Points: **2**
- **STORY-106:** Mechanical/electrical assessment before accident (5 categories) — Points: **5**
- **STORY-107:** Mechanical/electrical assessment after accident/damages — Points: **3**
- **STORY-108:** VIO digital signature & sign-off — Points: **3**
- **STORY-109:** AVIR routing (simultaneous to Security + MOT dashboards) — Points: **5**
- **STORY-110:** Police copy delivery mechanism (email/portal/API) — Points: **5**
- **STORY-111:** AVIR consolidated report generation (filterable by date/location/cause) — Points: **5**
- **STORY-112:** Two-copy system (Police original + Ministry office duplicate) — Points: **2**

**Epic Acceptance Criteria:**

- [ ] AVIR form matches Government Form 0051 field-for-field
- [ ] VIO can complete form with photos & mechanical assessment
- [ ] Form automatically routed to Security and MOT dashboards upon submission
- [ ] Police can access their copy (delivery mechanism TBD with Nigeria Police)
- [ ] MOT can generate consolidated accident reports

---

### EPIC-007: Notifications & Alerts System

_Send SMS & email notifications to applicants and Ministry staff_

- **STORY-120:** Notification message templates (submission confirmed, inspection scheduled, etc.) — Points: **3**
- **STORY-121:** SMS gateway integration (local Nigerian provider) — Points: **5**
- **STORY-122:** Email sending service (transactional emails via SendGrid or local) — Points: **3**
- **STORY-123:** Notification queue & retry logic (failed notifications) — Points: **5**
- **STORY-124:** Recipient preference management (SMS, email, both) — Points: **2**
- **STORY-125:** SLA breach alerts (inspection deadline approaching/exceeded) — Points: **3**
- **STORY-126:** Annual renewal reminder (60 days before expiry) — Points: **3**
- **STORY-127:** Payment failure/success notifications — Points: **2**
- **STORY-128:** Notification audit log (what was sent, to whom, when) — Points: **2**

**Epic Acceptance Criteria:**

- [ ] SMS notification sent when inspection scheduled
- [ ] Email receipt generated and sent after payment
- [ ] SLA breach alert sent to HOD when inspection deadline approaching
- [ ] Annual renewal reminder sent 60 days before expiry
- [ ] All notifications logged for audit purposes

---

### EPIC-008: Dashboard & Reporting (Phase 1)

_Create high-level dashboards for different user roles_

- **STORY-130:** Commissioner executive dashboard (KPIs, alert summary) — Points: **5**
- **STORY-131:** Permanent Secretary operational dashboard (staff performance, SLAs) — Points: **5**
- **STORY-132:** HOD department dashboard (inspection queue, SLA timers) — Points: **5**
- **STORY-133:** Field Inspector personal dashboard (today's schedule, pending assignments) — Points: **3**
- **STORY-134:** Finance Officer payment dashboard (daily summary, arrears) — Points: **5**
- **STORY-135:** External Applicant dashboard (application status, next steps) — Points: **3**
- **STORY-136:** Real-time status badge component (submitted, pending, approved, etc.) — Points: **2**
- **STORY-137:** Search & filter functionality (applications by applicant, status, date) — Points: **3**

**Epic Acceptance Criteria:**

- [ ] All dashboards display relevant role-specific information
- [ ] Real-time status updates (no page refresh needed)
- [ ] Search/filter works across 1000+ applications without performance lag
- [ ] Dashboards accessible on desktop and mobile

---

## PHASE 2: Extended Services (Weeks 9–14)

### EPIC-009: Private & Commercial Vehicle Inspection (VIS) Module

_Enable vehicle inspection data intake from VIS centres or manual entry_

**Related PRD Functional Requirements:** FR-060 through FR-066

- **STORY-140:** VIS domain model & database schema — Points: **5**
- **STORY-141:** Automated VIS data import (if VIS centres provide API/export) — Points: **8**
- **STORY-142:** Manual VIS form entry (Ministry staff enters inspection data) — Points: **3**
- **STORY-143:** Vehicle particulars capture (make, engine #, chassis #, classification) — Points: **3**
- **STORY-144:** Insurance verification step — Points: **2**
- **STORY-145:** Roadworthiness certificate entry — Points: **2**
- **STORY-146:** Two-track routing (Process 1: Security / Process 2: VIO/AVIR) — Points: **3**
- **STORY-147:** Police form completion (Process 1) — Points: **3**
- **STORY-148:** AVIR trigger (Process 2 links to AVIR module) — Points: **2**
- **STORY-149:** Payment collection (on-request or mandatory) — Points: **3**
- **STORY-150:** Towing dispatch request from VIS record — Points: **3**

**Epic Acceptance Criteria:**

- [ ] VIS centre can submit inspection data via API or manual form
- [ ] Ministry can route to Security or VIO track per inspection type
- [ ] Insurance and roadworthiness data captured and verified
- [ ] Payment collected successfully

---

### EPIC-010: Driving School Registration Module

_Enable driving schools to register and obtain certificates_

**Related PRD Functional Requirements:** FR-090 through FR-094

- **STORY-160:** Driving School domain model & database schema — Points: **3**
- **STORY-161:** Driving school application form (name, location, vehicles, instructors) — Points: **3**
- **STORY-162:** Document upload (supporting documents) — Points: **2**
- **STORY-163:** VIO test scheduling & tracking — Points: **3**
- **STORY-164:** Certificate workflow implementation (Temp vs. Permanent) — Points: **5**
- **STORY-165:** Certificate issuance & download — Points: **3**
- **STORY-166:** Rejection notification workflow (document not valid / incomplete) — Points: **2**
- **STORY-167:** Fixed fee configuration (registration fee + inspection fee) — Points: **2**
- **STORY-168:** Annual renewal reminder & renewal workflow — Points: **3**

**Epic Acceptance Criteria:**

- [ ] Driving school can submit complete application
- [ ] VIO can conduct test and report results
- [ ] Certificate (Temp or Permanent) issued upon approval
- [ ] Rejection reasons clearly communicated to applicant
- [ ] Annual renewal triggered 60 days before expiry

---

### EPIC-011: Certificate & Registration Workflow Engine

_Implement reusable workflow engine for Parks, Mass Transit, Driving Schools_

**Related PRD Functional Requirements:** FR-100 through FR-104

- **STORY-170:** Workflow state machine implementation (Application → Review → Decision) — Points: **8**
- **STORY-171:** Certificate type determination logic (Temp vs. Permanent based on compliance) — Points: **5**
- **STORY-172:** Rejection reason templating & notification — Points: **3**
- **STORY-173:** Fee engine implementation (Fixed / Fixed / Assessment-based) — Points: **5**
- **STORY-174:** Transpay validation flag for approved parks — Points: **3**
- **STORY-175:** Workflow customization per module (configurable steps, checklists) — Points: **5**

**Epic Acceptance Criteria:**

- [ ] Same workflow engine supports Parks, Mass Transit, Driving Schools
- [ ] Certificate type determined by configurable compliance rules
- [ ] Rejection reasons clearly mapped to specific document issues
- [ ] Fee types (Fixed/Fixed/Assessment) applied correctly per module
- [ ] Parks marked as "Transpay validated" before Transpay linking

---

### EPIC-012: Towing Coordination & Location Services

_Enable location-based towing van dispatch for accident/inspection recovery_

- **STORY-180:** Towing domain model & database schema — Points: **3**
- **STORY-181:** Towing van database (unit ID, GPS coordinates, service area) — Points: **2**
- **STORY-182:** Location-based dispatch algorithm (find nearest available unit) — Points: **5**
- **STORY-183:** Towing dispatch request form (from AVIR or VIS record) — Points: **3**
- **STORY-184:** Towing operator mobile app integration (receive dispatch, update status) — Points: **8**
- **STORY-185:** Real-time dispatch tracking (location map, ETA) — Points: **5**
- **STORY-186:** Towing completion confirmation & payment collection — Points: **3**

**Epic Acceptance Criteria:**

- [ ] Location-based algorithm finds nearest available towing unit
- [ ] Towing operator receives dispatch notification (app/SMS)
- [ ] Real-time tracking shows vehicle location and ETA
- [ ] Towing completion marked and payment collected

---

### EPIC-013: Advanced Reporting & Analytics (Phase 2)

_Create comprehensive reporting dashboards for management and compliance_

- **STORY-190:** Consolidated accident report generator (filterable by date/location/cause) — Points: **5**
- **STORY-191:** Revenue analytics dashboard (breakdown by fee category, trends) — Points: **5**
- **STORY-192:** Compliance heat map (parks/companies by status) — Points: **3**
- **STORY-193:** Staff performance reporting (inspections completed, avg time, quality) — Points: **3**
- **STORY-194:** Arrears tracking & collection dashboard — Points: **3**
- **STORY-195:** Export functionality (PDF, Excel, CSV) — Points: **3**
- **STORY-196:** Scheduled report delivery (email daily/weekly/monthly) — Points: **3**
- **STORY-197:** Data visualization (charts, graphs, heatmaps) — Points: **5**

**Epic Acceptance Criteria:**

- [ ] Accident report generator produces formatted report in <5 seconds
- [ ] Revenue dashboard shows breakdown by service type and trend
- [ ] Staff performance metrics exportable per HOD
- [ ] Scheduled reports delivered automatically
- [ ] Charts and visualizations render performance efficiently

---

### EPIC-014: Performance Optimization & Hardening

_Optimize database, frontend, and API for production scale_

- **STORY-200:** Database query profiling & indexing optimization — Points: **8**
- **STORY-201:** API response time optimization (caching, lazy loading) — Points: **5**
- **STORY-202:** Frontend code splitting & lazy component loading — Points: **5**
- **STORY-203:** Image optimization (Next.js Image component, CDN) — Points: **3**
- **STORY-204:** Load testing (simulate 10x nominal Ministry user load) — Points: **8**
- **STORY-205:** Security audit & penetration testing — Points: **8**
- **STORY-206:** Vulnerability scanning (dependencies, secrets) — Points: **5**
- **STORY-207:** Performance monitoring (Sentry, PostHog integration) — Points: **3**
- **STORY-208:** Incident response playbook — Points: **3**

**Epic Acceptance Criteria:**

- [ ] Platform maintains 99.5% uptime under 10x load
- [ ] API response times <200ms at p95
- [ ] Frontend Lighthouse score ≥90
- [ ] Zero critical security vulnerabilities
- [ ] Performance anomalies detected and alerted

---

## PHASE 3: Post-Launch Expansion (Weeks 15–16 & Beyond)

### EPIC-015: Private Cab & Ride-Hailing Module

_Enable private cab and ride-hailing services registration_

- **STORY-210:** Requirements gathering & design workshop — Points: **5**
- **STORY-211:** Private cab application form — Points: **5**
- **STORY-212:** Ride-hailing provider registration workflow — Points: **5**
- **STORY-213:** Driver verification & proficiency card — Points: **3**
- **STORY-214:** Vehicle inspection & insurance requirements — Points: **3**
- **STORY-215:** Fee collection & payment routing — Points: **3**
- **STORY-216:** Certificate issuance & renewal — Points: **3**

---

### EPIC-016: Logistics Service Provider Module

_Enable logistics companies to register_

- **STORY-220:** Requirements gathering — Points: **3**
- **STORY-221:** Logistics provider application form — Points: **3**
- **STORY-222:** Fleet registration & vehicle tracking — Points: **5**
- **STORY-223:** Compliance monitoring & reporting — Points: **3**

---

### EPIC-017: Public Portal (Phase 2+ Consideration)

_Create public-facing vehicle and park status lookup portal_

- **STORY-230:** Public portal requirements — Points: **3**
- **STORY-231:** Vehicle QR code lookup (scan → vehicle status) — Points: **5**
- **STORY-232:** Park status search (by name, location) — Points: **3**
- **STORY-233:** Company compliance status lookup — Points: **2**

---

## Story Point Summary

| Phase       | Epic Count | Story Count | Total Points | Estimated Duration |
| ----------- | ---------- | ----------- | ------------ | ------------------ |
| **Phase 1** | 8          | 90+         | ~400         | 8 weeks (5 FTE)    |
| **Phase 2** | 6          | 70+         | ~300         | 6 weeks (5 FTE)    |
| **Phase 3** | 3          | 20+         | ~80          | 2 weeks (planning) |
| **TOTAL**   | 17         | 180+        | ~780         | 16 weeks           |

---

## Story Template

When creating a new story, use this format:

```markdown
### STORY-XXX: [Story Title]

**Epic:** EPIC-XXX  
**Points:** [1, 2, 3, 5, 8, 13, 21]  
**Assignee:** [Name or @mention]  
**Status:** Not Started | In Progress | In Review | Done

#### Description

[What does this story do?]

#### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

#### Technical Notes

[API endpoints, database tables, related stories, etc.]

#### Dependencies

[Other stories or external dependencies]

#### Testing Approach

[Unit tests, integration tests, manual testing instructions]
```

---

## Current Sprint Tracking

See `docs/PROGRESS.md` for sprint assignments and real-time status.

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Next Review:** Week 1 kickoff
