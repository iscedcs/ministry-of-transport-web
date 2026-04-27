# Implementation Plan — Ministry of Transport Platform

**Document Owner:** ISCE Digital Concept  
**Prepared For:** Anambra State Ministry of Transport  
**Version:** 1.0 — April 2026  
**Delivery Model:** Public-Private Partnership (Zero Cost to Government)

---

## Executive Summary

This document outlines the phased implementation approach for the Integrated Transport Services Automation Platform. The project is structured as three phases spanning 16 weeks of development, with Phase 1 (core regulatory modules) ready for pilot launch at Week 8.

| Phase       | Duration    | Modules                                                   | Go-Live Status   |
| ----------- | ----------- | --------------------------------------------------------- | ---------------- |
| **Phase 1** | Weeks 1–8   | Parks, Mass Transit, AVIR, Payments, Admin                | **Pilot Ready**  |
| **Phase 2** | Weeks 9–14  | VIS, Driving Schools, Towing, Reporting                   | **Full Feature** |
| **Phase 3** | Weeks 15–16 | Phase 2 Post-Launch (Private Cabs, Logistics, Expansions) | **Planned**      |

---

## Phase 1: Core Regulatory Platform (Weeks 1–8)

**Goal:** Establish the platform foundation with the three primary Ministry service lines: motor parks, mass transit registration, and accident/vehicle inspection.

### Deliverables

#### Week 1–2: Foundation & Design System

- ✅ Project scaffolding (Next.js, Tailwind, TypeScript)
- ✅ Design system implementation (token-driven UI components)
- ✅ Database schema (Prisma) for all Phase 1 entities
- ✅ Authentication framework (Ministry staff roles + external ASIN)
- **Output:** Design tokens finalized, UI component library v1 ready, DB deployed to Neon

#### Week 3–4: Motor Park Module (FR-010 through FR-019)

- Application submission workflow (online form + document upload)
- Inspection team routing and scheduling
- Permit to Build issuance (Commissioner/PS sign-off)
- Re-inspection workflow with proximity evaluation
- Annual revalidation reminders and renewal
- **Key Integration:** Document storage (GCS), email/SMS notifications
- **Output:** Motor Park module live in staging; can submit, inspect, approve

#### Week 5–6: Mass Transit & Payment Integration (FR-020 through FR-030, FR-040 through FR-044)

- Mass transit application workflow (min. 5-vehicle fleet validation)
- Document verification pipeline
- **Paystack Integration:** One-off application fee payment, linked to ASIN
- QR code generation and assignment per vehicle
- Fleet change notifications
- **Key Integration:** Paystack API (transactions, payment verification)
- **Output:** Full mass transit workflow + payments live; can process fee collection

#### Week 7: Accident Vehicle Inspection Report (AVIR) Module (FR-070 through FR-081)

- AVIR form digital replication (exact match to Government Form 0051)
- Mechanical assessment before/after accident capture
- Routing to Security dashboard and MOT dashboard simultaneously
- Two-copy system (Police + Ministry office)
- **Key Integration:** Police report delivery mechanism (email/portal/API — to be confirmed with Nigeria Police)
- **Output:** AVIR module functional; can file accident reports

#### Week 8: Admin Dashboard & Launch Readiness

- Ministry admin panel (user management, inspection scheduling, application queue)
- Compliance status registry and alerts
- Revenue reporting dashboard for Finance team
- Audit trail logging for all actions
- Data backup and disaster recovery validation
- **Output:** Phase 1 pilot-ready; admin functions operational

### Phase 1 Success Criteria

- [ ] 100% of motor park applications can be submitted digitally
- [ ] 100% of mass transit registrations accepted via platform
- [ ] All payments routed through Paystack with receipt confirmation
- [ ] All AVIRs filed digitally with police routing operational
- [ ] Ministry admin can view full compliance status dashboard
- [ ] Platform uptime ≥99.5% during business hours
- [ ] Zero critical bugs in production

---

## Phase 2: Extended Services & Optimization (Weeks 9–14)

**Goal:** Complete the remaining modules and introduce advanced features for deeper compliance monitoring and operational efficiency.

### Deliverables

#### Week 9–10: Private & Commercial Vehicle Inspection (VIS) Module (FR-060 through FR-066)

- Vehicle inspection data intake (automated from VIS centres + manual entry)
- Two-track routing (Process 1: Security / Process 2: VIO/AVIR)
- Insurance and roadworthiness verification
- Integration with computerized VIS centres (if available)
- **Output:** VIS module live; vehicle inspection data flows into platform

#### Week 11: Driving School Registration (FR-090 through FR-094)

- Online driving school application workflow
- Certificate workflow engine implementation (Temporary vs. Permanent)
- VIO test scheduling and tracking
- **Output:** Driving schools can apply; certificates issued digitally

#### Week 12: Towing Coordination & Location Services

- Location-based towing van dispatch from accident/inspection records
- Real-time dispatch assignment (requires GPS-enabled towing units)
- Dispatch status tracking
- **Output:** Towing operators receive dispatch requests; status tracked on platform

#### Week 13: Advanced Reporting & Analytics

- Consolidated accident report generation (filterable by date, location, vehicle type, cause)
- Revenue analytics dashboard (breakdown by fee category, arrears tracking)
- Compliance trend reporting for Permanent Secretary/Commissioner
- Monthly/annual export capabilities
- **Output:** Executive dashboards fully functional; data export working

#### Week 14: Performance Optimization & Hardening

- Database query optimization (indexing, query profiling)
- Frontend performance tuning (code splitting, lazy loading, image optimization)
- Security audit (penetration testing, vulnerability scan)
- Load testing (simulate peak Ministry user load)
- **Output:** Platform ready for production scale

### Phase 2 Success Criteria

- [ ] VIS module accepts vehicle inspection data from centres
- [ ] Driving schools can complete full registration workflow
- [ ] Towing dispatch operational with real-time tracking
- [ ] Advanced reporting dashboards accessible to Finance and Management
- [ ] Platform maintains 99.5% uptime under 10x nominal load
- [ ] Zero critical security vulnerabilities

---

## Phase 3: Post-Launch & Expansion (Weeks 15–16 Planned)

**Goal:** Set up infrastructure for Phase 2 post-launch enhancements; plan for private cab/ride-hailing and logistics modules.

### Planned Deliverables

- Requirements gathering for private cab registration module
- Logistics service provider module design
- Public-facing vehicle/park status lookup portal (for passengers and enforcement)
- CAC document verification integration planning
- **Output:** Roadmap and design documents ready for Phase 3 implementation team

---

## Dependencies & Assumptions

### External Dependencies

| Dependency                                          | Owner                           | Impact                                     | Status      |
| --------------------------------------------------- | ------------------------------- | ------------------------------------------ | ----------- |
| **Anambra State PayDirect Integration**             | Ministry Finance                | Payment collection impossible without this | **Pending** |
| **Paystack API Credentials**                        | ISCE Digital Concept / Paystack | Required for all payment testing           | **Ready**   |
| **Nigeria Police (Motor Traffic Division) Contact** | Ministry / Nigeria Police       | AVIR routing mechanism                     | **Pending** |
| **Computerized VIS Centre Integration**             | Ministry VIS / HOD VIS          | Automated vehicle data import              | **TBD**     |
| **Email Domain**                                    | Ministry IT                     | Notification routing                       | **Pending** |
| **SMS Gateway Provider**                            | Ministry IT                     | Notification delivery                      | **Pending** |
| **Data Hosting Location**                           | Ministry / ISCE Ops             | Infrastructure provisioning                | **Pending** |

### Assumptions

- Ministry will provide PayDirect integration details by Week 1
- ASIN (Anambra State Identification Number) is active and queryable
- Neon (PostgreSQL hosting) is available for staging/production databases
- Ministry IT will provision Ministry email domain for notifications
- Field inspectors have mobile device access for inspection entry

---

## Resource Allocation

| Role                          | Allocation       | Weeks                                                           |
| ----------------------------- | ---------------- | --------------------------------------------------------------- |
| **Frontend Engineer**         | Full-time        | Weeks 1–14 (UI components, forms, dashboards)                   |
| **Backend Engineer**          | Full-time        | Weeks 1–14 (APIs, database, integrations)                       |
| **Paystack Integration Lead** | Part-time → Full | Weeks 3–6, 12–13 (payment flows)                                |
| **QA / Testing**              | Part-time → Full | Weeks 5–14 (test cases, regression, performance)                |
| **DevOps / Infrastructure**   | Part-time        | Weeks 1–2, 8–14 (environment setup, deployment pipelines)       |
| **Product Lead (ISCE)**       | Ongoing          | Weeks 1–14 (requirements clarification, stakeholder management) |
| **Ministry Liaison**          | As-needed        | Weeks 1–14 (policy questions, decision authority)               |

---

## Risk Mitigation

| Risk                                | Likelihood | Impact   | Mitigation                                                             |
| ----------------------------------- | ---------- | -------- | ---------------------------------------------------------------------- |
| PayDirect integration delayed       | High       | Critical | Start with mock PayDirect API; plan 2-week buffer for real integration |
| Nigeria Police AVIR routing unclear | Medium     | High     | Establish contact by Week 1; plan email fallback if API not ready      |
| Scope creep on UI components        | Medium     | Medium   | Freeze Phase 1 component specs in Week 2; add-ons go to Phase 3        |
| Performance degrades at scale       | Low        | High     | Load test by Week 13; index database proactively                       |
| Security vulnerabilities discovered | Low        | Critical | Penetration test in Week 14; emergency patching plan in place          |

---

## Communication & Governance

### Weekly Standups

- **Day:** Tuesdays, 10:00 AM WAT
- **Attendees:** ISCE team (Product, Frontend, Backend), Ministry Liaison
- **Output:** Status update, blockers, decisions needed

### Bi-weekly Steering Committee Meetings

- **Day:** Alternate Thursdays, 2:00 PM WAT
- **Attendees:** Ministry (Permanent Secretary / Commissioner), ISCE Lead, Finance contact
- **Purpose:** Strategic alignment, decision authority, revenue/timeline review

### Escalation Path

1. **Technical Issue:** ISCE Product Lead → Ministry IT
2. **Policy Question:** ISCE Product Lead → Ministry (Permanent Secretary)
3. **Budget/Resource:** ISCE Lead → Ministry Finance / Commissioner
4. **Integration Blocker:** ISCE Lead → External provider (Paystack, PayDirect, Police)

---

## Success Metrics & KPIs

### By Week 8 (Phase 1 Pilot)

- [ ] Motor park applications: 5 test cases completed end-to-end
- [ ] Mass transit registrations: 3 test companies registered with fee payment
- [ ] AVIR forms: 10 accident reports filed and routed to dashboards
- [ ] System uptime: 99.5% during test period

### By Week 14 (Phase 2 Complete)

- [ ] VIS module: Accepts data from 100% of vehicle inspections
- [ ] Driving schools: 2 schools registered, certificates issued
- [ ] Towing: 50 dispatch requests logged and tracked
- [ ] Reports: Finance team can generate monthly revenue report in <10 seconds

### By Week 16 (Post-Launch Plan)

- [ ] Phase 3 roadmap approved by Ministry and ISCE Board
- [ ] Private cab module requirements documented
- [ ] Public portal wireframes ready for stakeholder review

---

## Deployment & Release Strategy

### Environment Strategy

- **Development:** Local (pnpm dev) + staging (Vercel branch preview)
- **Staging:** Full replica of production (Neon PostgreSQL, Paystack test mode)
- **Production:** Vercel (frontend) + Neon (database) with automated backup

### Release Cadence

- **Weeks 1–8:** Daily builds, weekly releases to staging
- **Week 8:** Phase 1 pilot release to Ministry users
- **Weeks 9–14:** Bi-weekly releases (new features + stability patches)
- **Week 14:** Phase 2 GA release to full Ministry staff
- **Post-launch:** Weekly maintenance releases; hotfixes as-needed

### Rollback Plan

- All production deployments include automated rollback trigger
- Database migrations tested on staging replica before production
- Data backup taken before every release

---

## Budget & Resource Allocation

_(To be detailed in separate PPP contract)_

**Estimated Costs (for reference):**

- Infrastructure (Vercel, Neon, GCS): ~$1,500–2,000/month
- Development team: 6 FTE × 16 weeks
- Paystack transaction fees: 1.5% + ₦100 per transaction (deducted from revenue share)
- SMS/Email gateway: ~$300–500/month
- Security & compliance: ~$2,000 for external audit

**Revenue Share Model:** _(To be negotiated before contract signature — see PRD Q-1)_

---

## Sign-Off & Approval

| Role                         | Name | Signature | Date |
| ---------------------------- | ---- | --------- | ---- |
| ISCE Project Lead            | —    | —         | —    |
| Ministry Permanent Secretary | —    | —         | —    |
| Ministry Finance             | —    | —         | —    |

---

**Document Status:** Draft  
**Next Review:** Week 1 kickoff (after PRD approval)  
**Last Updated:** April 2026
