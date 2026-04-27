# Roles & Duties — Ministry of Transport Platform

**Detailed Responsibilities, Permissions, and Features by User Role**

---

## Overview

This document defines the seven primary user roles in the platform, their access permissions, and the specific features each role uses. All roles are defined in the database with row-level security (RLS) constraints; a user belongs to exactly one role.

| Role                                 | Type     | Count     | Primary Responsibility                            |
| ------------------------------------ | -------- | --------- | ------------------------------------------------- |
| **Commissioner**                     | Ministry | 1         | Executive authority; final approvals              |
| **Permanent Secretary**              | Ministry | 1         | Operational authority; policy enforcement         |
| **Head of Department (HOD)**         | Ministry | 5–7       | Department-level workflow routing and supervision |
| **Field Inspector**                  | Ministry | 10–20+    | Site inspections; field data entry                |
| **Finance Officer**                  | Ministry | 2–3       | Revenue tracking; payment reconciliation          |
| **Vehicle Inspection Officer (VIO)** | Ministry | 5–10      | Mechanical assessment; AVIR completion            |
| **External Applicant**               | Public   | Unlimited | Application submission; document upload; payment  |

---

## Role Definitions & Feature Matrix

### 1. COMMISSIONER FOR TRANSPORT

**Authority:** Executive decision-maker; ultimate approval authority for all regulatory permits.  
**Reports To:** Governor (chain of command)  
**Users:** 1

#### Responsibilities

- Review and approve/reject high-level policy decisions on the platform
- Issue or revoke digital approval letters
- Authorize "Permit to Build" for motor parks upon inspection recommendation
- Authorize "Permit to Operate" for mass transit companies
- Review compliance dashboard at glance; spot-check enforcement

#### Features & Permissions

| Feature                   | Permission   | Module         | Notes                                                                  |
| ------------------------- | ------------ | -------------- | ---------------------------------------------------------------------- |
| **View Dashboard**        | ✅ Read-only | All            | Executive dashboard: all applications, compliance status, revenue KPIs |
| **Review Applications**   | ✅ Read      | Parks, Transit | View all submitted applications with inspection reports                |
| **Issue Permits**         | ✅ Write     | Parks, Transit | Approve inspections → issue "Permit to Build" or "Permit to Operate"   |
| **Revoke Permits**        | ✅ Write     | Parks, Transit | Revoke approval for non-compliance (with reason)                       |
| **Sign Approval Letters** | ✅ Generate  | All Modules    | Digital signatures on final approval letters (via DocuSign or similar) |
| **Audit Trail**           | ✅ Read      | All Modules    | View all actions taken on platform; immutable log                      |
| **Reports Export**        | ✅ Export    | Admin          | Download monthly reports: revenue, applications processed, compliance  |
| **System Configuration**  | ❌ No        | Admin          | (Delegated to Permanent Secretary or System Admin)                     |

#### Dashboard Elements

- **KPI Cards:** Total applications, approvals this month, revenue, compliance rate
- **Application Queue:** All applications sorted by status; click to review
- **Compliance Heat Map:** Parks/transit companies by status (approved, pending, non-compliant)
- **Alerts:** High-priority items (overdue inspections, large applications awaiting decision)

#### Email Notifications

- New applications requiring decision (daily digest or immediate, configurable)
- Inspection team SLA breaches
- Large revenue transactions (thresholds configurable)
- System alerts (uptime, security incidents)

---

### 2. PERMANENT SECRETARY (PS)

**Authority:** Operational authority; delegates Commissioner tasks; primary Ministry liaison for PPP.  
**Reports To:** Commissioner  
**Users:** 1

#### Responsibilities

- Delegate Commissioner responsibilities as needed
- Approve/reject applications when Commissioner unavailable
- Manage Ministry staff accounts and role assignments
- Configure system workflows and fee schedules
- Monitor operational performance (SLAs, uptime, revenue)
- Liaison with ISCE Digital Concept on platform issues

#### Features & Permissions

| Feature                     | Permission           | Module         | Notes                                                                    |
| --------------------------- | -------------------- | -------------- | ------------------------------------------------------------------------ |
| **View Dashboard**          | ✅ Read-only         | All            | Operational dashboard: all metrics, staff performance                    |
| **Review Applications**     | ✅ Read              | Parks, Transit | Full application details, inspection reports                             |
| **Issue Permits**           | ✅ Write (Delegated) | Parks, Transit | When Commissioner absent; same authority as Commissioner                 |
| **Revoke Permits**          | ✅ Write (Delegated) | Parks, Transit | Same as Commissioner when delegated                                      |
| **Staff Management**        | ✅ Full Admin        | Admin          | Create/edit/delete Ministry user accounts; assign roles; set permissions |
| **Workflow Configuration**  | ✅ Write             | Admin          | Define SLA timers, inspection checklists, fee schedules                  |
| **Fee Schedule Management** | ✅ Write             | Admin          | Set park fees, registration fees, renewal fees per service               |
| **System Configuration**    | ✅ Write             | Admin          | Email templates, SMS gateway settings, Paystack account linking          |
| **Reports & Analytics**     | ✅ Read              | Admin          | Revenue, application throughput, staff performance metrics               |
| **Audit Trail**             | ✅ Read              | All Modules    | Full system audit log; who did what when                                 |
| **Emergency Overrides**     | ✅ Write             | Admin          | Pause workflows, disable payments temporarily (emergency only)           |

#### Dashboard Elements

- **Staff Performance:** Inspection queue per HOD, average processing time, quality metrics
- **Operational Metrics:** System uptime, API response times, error rates
- **Revenue Dashboard:** Daily/weekly/monthly revenue by category, payment status, arrears
- **Alerts:** SLA breaches, payment failures, system issues, staff escalations

#### System Administrator Functions (PS can delegate to IT admin)

- User account provisioning and deprovisioning
- Role and permission assignment
- Workflow rule configuration (inspection checklist items, fee amounts, SLA timers)
- Email/SMS template editing
- PayDirect account linking and payment routing

---

### 3. HEAD OF DEPARTMENT (HOD)

**Authority:** Department-level workflow coordinator; supervises field teams; processes approvals within department scope.  
**Reports To:** Permanent Secretary  
**Users:** 5–7 (one per department)

#### Department Mapping

| Department                            | HOD Role                 | Primary Responsibility                                                   |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| **Parks**                             | HOD Parks                | Motor park inspection team lead; site evaluation                         |
| **Vehicle Inspection Services (VIS)** | HOD VIS                  | Vehicle roadworthiness inspection; AVIR sign-off authority               |
| **Transport Operations (T.Ops)**      | HOD Transport Operations | Route compliance, transport flow assessment                              |
| **Parks Revalidation Services (PRS)** | HOD Parks Revalidation   | Annual revalidation cycle management                                     |
| **Finance**                           | HOD Finance              | Payment reconciliation, arrears tracking (overlaps with Finance Officer) |
| **Security/Police Liaison**           | HOD Security             | AVIR routing to police, security report coordination                     |
| **Towing Coordination**               | HOD Towing               | Dispatch management, towing unit assignment                              |

#### Responsibilities (General to all HODs)

- Review applications routed to department
- Schedule inspections for field team members
- Supervise field inspector work; review inspection reports
- Route approved applications to next stage in workflow
- Alert Permanent Secretary of SLA breaches or issues
- Generate monthly departmental reports

#### Features & Permissions

| Feature                     | Permission       | Module              | Notes                                                                                |
| --------------------------- | ---------------- | ------------------- | ------------------------------------------------------------------------------------ |
| **View Dashboard**          | ✅ Read-only     | Assigned Department | See only applications and inspections assigned to HOD's department                   |
| **Queue Management**        | ✅ Read, Assign  | Assigned Module     | View pending applications; assign to field inspectors                                |
| **Inspection Scheduling**   | ✅ Write         | Assigned Module     | Schedule site inspections; send notifications to applicants                          |
| **Review Reports**          | ✅ Read, Approve | Assigned Module     | Review field inspector inspection reports; approve or request revision               |
| **Route Applications**      | ✅ Write         | Assigned Module     | Move applications through workflow stages (e.g., "inspection approved" → next stage) |
| **Staff Supervision**       | ✅ Read          | Admin               | View field inspector assignments, completion rates, quality metrics                  |
| **SLA Monitoring**          | ✅ Read          | Admin               | Monitor inspection SLA timers (e.g., 5-day mass transit inspection deadline)         |
| **Department Reports**      | ✅ Export        | Admin               | Generate monthly report: inspections completed, time-to-completion, issues           |
| **Applicant Communication** | ✅ Write         | All Modules         | Send messages to applicants (scheduling notices, request for more info)              |
| **Audit Trail (Dept)**      | ✅ Read          | Assigned Department | View all actions within department only                                              |
| **Create/Edit Checklists**  | ⚠️ Limited       | Admin               | View inspection checklists; HOD cannot modify (PS does)                              |

#### Dashboard Elements (by Department)

- **Inspection Queue:** Applications assigned to HOD's field inspectors; status and age
- **SLA Timer:** Visual countdown to SLA deadline (e.g., 5 days for mass transit)
- **Field Inspector Performance:** Inspections completed, average time, quality flags
- **Escalations:** Applications flagged for issues or requiring HOD decision

#### Specific HOD Duties

**HOD Parks:**

- Assign park applications to field inspector for site inspection
- Review inspection findings (parking arrangement, conveniences, water, fire extinguishers, etc.)
- Recommend approval or rejection to Commissioner/PS based on standards compliance
- Approve parks for annual revalidation

**HOD VIS:**

- Assign vehicle inspection applications to VIOs
- Review roadworthiness inspection reports
- Coordinate with computerised VIS centres for inspection data
- Approve vehicle roadworthiness for mass transit fleet

**HOD Transport Operations:**

- Review mass transit applications for route compliance
- Assess whether proposed routes conflict with existing transport patterns
- Approve or flag routes for revision

**HOD Parks Revalidation Services (PRS):**

- Monitor annual revalidation dates for all approved parks
- Trigger revalidation workflow 90 days before expiry
- Track revalidation applications; report status to Permanent Secretary

**HOD Finance:**

- Monitor payment status for all applications
- Flag overdue payments to Finance Officer
- Reconcile monthly PayDirect deposits with recorded transactions
- Report arrears to Permanent Secretary

**HOD Security:**

- Receive AVIR reports routed from VIOs
- Coordinate with Nigeria Police (Motor Traffic Division) for report delivery
- Generate security summary reports (accident trends, high-risk locations)
- Manage towing unit dispatch for accident recovery

---

### 4. FIELD INSPECTOR

**Authority:** On-site assessment; data entry authority for inspection findings.  
**Reports To:** HOD (of assigned department)  
**Users:** 10–20+ (distributed across departments)

#### Responsibilities

- Conduct on-site inspections per HOD assignment
- Photograph and document site conditions
- Complete digital inspection checklist
- Enter findings into platform
- Respond to applicant follow-up requests
- May use mobile device for field work

#### Features & Permissions

| Feature                     | Permission           | Module          | Notes                                                                      |
| --------------------------- | -------------------- | --------------- | -------------------------------------------------------------------------- |
| **View Assigned Queue**     | ✅ Read              | Assigned Module | See only inspections assigned to field inspector by HOD                    |
| **View Inspection Details** | ✅ Read              | Assigned Module | Application details, applicant contact, inspection checklist               |
| **Upload Photos/Documents** | ✅ Write             | All Modules     | Attach inspection site photos, measurements, compliance documentation      |
| **Complete Checklist**      | ✅ Write             | Assigned Module | Mark off inspection items (parking arrangement, conveniences, water, etc.) |
| **Enter Findings**          | ✅ Write             | Assigned Module | Free-text notes, recommendations, issues observed                          |
| **Submit Report**           | ✅ Write             | Assigned Module | Sign inspection report; submit to HOD for review                           |
| **View Status**             | ✅ Read              | All Modules     | Check if HOD has approved/rejected report; see next stage                  |
| **Applicant Messages**      | ✅ Read, Reply       | All Modules     | Receive and respond to applicant questions during inspection               |
| **Mobile Form Entry**       | ✅ Write (Mobile UI) | All Modules     | Enter inspection data on mobile device (offline capable with sync)         |
| **View Maps**               | ✅ Read              | Parks, Towing   | Map-based location view of assigned inspection sites; directions           |
| **Personal Dashboard**      | ✅ Read              | Assigned Module | Daily inspection schedule, pending assignments, completed inspections      |

#### Dashboard Elements

- **Today's Schedule:** Inspections assigned for today; location, time, applicant contact
- **Pending Inspections:** All open assignments; age and HOD priority
- **Completed Inspections:** History of inspections submitted; approval/rejection status
- **Mobile Notifications:** Alerts when HOD adds new inspection, when applicant sends message

#### Mobile-Specific Features

- Offline inspection form (syncs when online)
- GPS location tagging of inspection site
- Photo capture and attachment
- Digital signature or PIN confirmation on report submission

---

### 5. FINANCE OFFICER

**Authority:** Revenue tracking and payment reconciliation; financial reporting.  
**Reports To:** HOD Finance / Permanent Secretary  
**Users:** 2–3

#### Responsibilities

- Track all fee payments through Paystack and PayDirect
- Reconcile daily payment logs with bank deposits
- Flag failed, pending, or duplicate payments
- Generate monthly revenue reports
- Track arrears and overdue payments
- Communicate payment status to applicants
- Prepare financial statements for management review

#### Features & Permissions

| Feature                       | Permission   | Module   | Notes                                                                       |
| ----------------------------- | ------------ | -------- | --------------------------------------------------------------------------- |
| **View Payment Dashboard**    | ✅ Read-only | Payments | All transactions, status, amounts, payment method                           |
| **Filter Transactions**       | ✅ Read      | Payments | By date range, applicant, fee type, status, payment method                  |
| **Payment Status Tracking**   | ✅ Read      | Payments | Track Paystack status (pending, completed, failed, reversed)                |
| **Reconciliation Reports**    | ✅ Export    | Payments | Download daily/weekly/monthly reconciliation sheet                          |
| **Arrears Tracking**          | ✅ Read      | Payments | View all overdue payments; send reminder notifications                      |
| **Receipt Generation**        | ✅ Read      | Payments | View and regenerate digital payment receipts for applicants                 |
| **Revenue Reports**           | ✅ Export    | Admin    | Monthly revenue breakdown by fee type, service module, HOD department       |
| **Bank Reconciliation**       | ✅ Write     | Admin    | Match Paystack deposits to PayDirect account deposits; flag discrepancies   |
| **Payment Reversal Requests** | ✅ Write     | Payments | Initiate refund for duplicate or erroneous payments (requires HOD approval) |
| **Audit Trail (Finance)**     | ✅ Read      | Payments | View all payment history and reconciliation actions                         |
| **Applicant Payment Lookup**  | ✅ Read      | Payments | Search by applicant ASIN or application ID to see all related payments      |
| **Excel/CSV Export**          | ✅ Export    | Admin    | Export transaction data for external reconciliation (accounting system)     |

#### Dashboard Elements

- **Daily Payment Summary:** Total collected today, count of transactions, by payment method
- **Monthly Revenue:** Running total for current month; comparison to prior months
- **Payment Status Breakdown:** % completed, pending, failed, reversed
- **Top Payers:** Applicants by total amount paid (mass transit companies, large parks)
- **Arrears List:** Overdue payments, days overdue, contact info for follow-up
- **Bank Reconciliation Status:** Deposits matched, discrepancies identified

#### Paystack Integration

- Finance Officer cannot directly control Paystack; cannot issue refunds unilaterally
- All Paystack transactions viewable in platform; status synced in real-time
- Refunds initiated through platform; trigger Paystack API call with Finance Officer approval + HOD sign-off

---

### 6. VEHICLE INSPECTION OFFICER (VIO)

**Authority:** Mechanical assessment; AVIR form completion and sign-off.  
**Reports To:** HOD VIS / Field Team Lead  
**Users:** 5–10

#### Responsibilities

- Conduct vehicle mechanical inspections (roadworthiness assessment)
- Complete Accident Vehicle Inspection Report (AVIR) forms when accidents occur
- Assess vehicle condition before/after accident
- Recommend cause of accident
- Route completed AVIR to Security and MOT dashboards
- Coordinate with police for accident reports
- May conduct inspections at computerised VIS centres or roadside

#### Features & Permissions

| Feature                       | Permission        | Module      | Notes                                                                  |
| ----------------------------- | ----------------- | ----------- | ---------------------------------------------------------------------- |
| **View Assigned Inspections** | ✅ Read           | VIS, AVIR   | Queue of vehicles assigned for inspection                              |
| **Enter Vehicle Details**     | ✅ Write          | VIS, AVIR   | Vehicle make, engine #, chassis #, classification, speedometer reading |
| **Roadworthiness Assessment** | ✅ Write          | VIS         | Mark off mechanical checklist (engine, brakes, lights, steering, etc.) |
| **Enter AVIR Form**           | ✅ Write          | AVIR        | Complete full accident vehicle inspection report form                  |
| **Photo Documentation**       | ✅ Write          | VIS, AVIR   | Upload photos of vehicle condition, damage, accident scene             |
| **Insurance Verification**    | ✅ Write          | VIS, AVIR   | Enter insurance company name, certificate/cover note, date             |
| **Police Details Entry**      | ✅ Write          | AVIR        | Record investigating police officer, reference number, station         |
| **Mechanical Assessment**     | ✅ Write          | AVIR        | Detailed before/after assessment (5 categories per AVIR form)          |
| **Cause Recommendation**      | ✅ Write          | AVIR        | Recommend probable cause of accident                                   |
| **Digital Signature**         | ✅ Write          | AVIR        | Sign/authorize completed AVIR form (biometric or PIN)                  |
| **Submit Report**             | ✅ Write          | AVIR        | Submit to routing system (Security + MOT dashboards)                   |
| **View Route Status**         | ✅ Read           | AVIR        | Confirm AVIR routed to police; police reference number recorded        |
| **Payment Entry**             | ✅ Write          | Payments    | Record VIO inspection fee payment (if collected at inspection)         |
| **Towing Dispatch**           | ✅ Write          | AVIR, VIS   | Request towing van for accident vehicle recovery; specify location     |
| **Mobile Form Entry**         | ✅ Write (Mobile) | VIS, AVIR   | Enter inspection data on mobile device with offline capability         |
| **Audit Trail (VIO)**         | ✅ Read           | All Modules | View own inspection history and report submissions                     |

#### Dashboard Elements

- **Today's Inspections:** Schedule of vehicle inspections assigned
- **Pending AVIRs:** Accident reports requiring immediate attention
- **Recently Submitted:** Completed inspection reports; status with approver
- **Towing Requests:** Active towing dispatches initiated by VIO

#### AVIR Form Workflow (VIO's Responsibility)

1. Receive accident incident notification
2. Complete AVIR form on platform (all 7 sections)
3. Attach photos and supporting documentation
4. Enter VIO name, station, date, and digital signature
5. Submit form → automatically routed to:
   - Security dashboard (for police coordination)
   - MOT dashboard (for compliance tracking)
6. VIO receives confirmation that report routed successfully
7. VIO can view police reference number once Nigeria Police receives report

---

### 7. EXTERNAL APPLICANT (Public User)

**Authority:** Apply for services; submit documents; make payments; track application status.  
**Identity:** ASIN-based (Anambra State Identification Number) or email + phone verification  
**Users:** Unlimited (all external park owners, mass transit companies, driving schools)

#### User Types

- **Park Owner:** Applying for motor park approval/revalidation
- **Mass Transit Company:** Registering fleet of ≥5 vehicles
- **Driving School:** Registering driving school for VIO testing
- **Individual Driver:** Submitting accident vehicle inspection report

#### Responsibilities

- Submit complete application with required documents
- Upload supporting documentation
- Provide accurate information (penalties for falsification)
- Respond to Ministry requests for clarification
- Pay applicable fees through Paystack
- Check application status regularly
- Receive and respond to Ministry notifications

#### Features & Permissions

| Feature                      | Permission          | Module          | Notes                                                                                |
| ---------------------------- | ------------------- | --------------- | ------------------------------------------------------------------------------------ |
| **Create Account**           | ✅ Write            | Auth            | Register using ASIN or email; verify phone/email                                     |
| **Complete Profile**         | ✅ Write            | Auth            | Enter business/personal details                                                      |
| **View Application Form**    | ✅ Read             | All Modules     | See form fields and requirements before starting                                     |
| **Submit Application**       | ✅ Write            | All Modules     | Fill form, upload documents, submit                                                  |
| **Track Status**             | ✅ Read             | All Modules     | View real-time status of application (submitted, pending inspection, approved, etc.) |
| **Upload Documents**         | ✅ Write            | All Modules     | CAC, tax clearance, photos, land documents, etc.                                     |
| **View Inspection Schedule** | ✅ Read             | All Modules     | See when Ministry team will conduct site inspection                                  |
| **Receive Notifications**    | ✅ Read             | All Modules     | SMS/email updates on application progress                                            |
| **Reply to Ministry**        | ✅ Write            | All Modules     | Message back if Ministry requests clarification                                      |
| **Pay Application Fee**      | ✅ Write (Paystack) | Payments        | Initiate payment; redirected to Paystack checkout                                    |
| **View Payment History**     | ✅ Read             | Payments        | See all payments made for this application                                           |
| **Download Receipt**         | ✅ Export           | Payments        | Download digital payment receipt                                                     |
| **View Approval Letter**     | ✅ Read             | All Modules     | Download final approval letter (when approved)                                       |
| **QR Code Download**         | ✅ Export           | Mass Transit    | Download vehicle QR codes after approval (fleet operators)                           |
| **Certificate Download**     | ✅ Export           | Driving Schools | Download temporary or permanent certificate (driving schools)                        |
| **Request Revalidation**     | ✅ Write            | Parks, Transit  | Submit renewal application for annual permit renewal                                 |
| **Report Accident**          | ✅ Write            | AVIR            | Initiate accident vehicle inspection report (driver, police, or public)              |
| **View Dashboard**           | ✅ Read             | All Modules     | Personal dashboard: all my applications, status, next steps                          |
| **Edit Application**         | ✅ Write (Limited)  | All Modules     | Correct information before submission; cannot edit after approval                    |

#### Dashboard Elements (Personal)

- **My Applications:** All active and historical applications; current status, next steps
- **Timeline:** Expected completion date for each application
- **Next Action:** What Ministry is waiting for; what applicant needs to do
- **Payment Status:** All fees paid, outstanding balances, due dates
- **Documents:** Uploaded documents; flagged items requiring resubmission
- **Notifications:** Messages from Ministry, payment confirmations, approval letters

#### Application Statuses (Applicant Visibility)

- **DRAFT** → Still editing form; not submitted yet
- **SUBMITTED** → Application received by Ministry; under review
- **PENDING INSPECTION** → Site inspection scheduled; waiting for Ministry team
- **INSPECTION COMPLETE** → Ministry completed inspection; waiting for decision
- **APPROVED** → Application approved; access approval letter and certificates
- **REJECTED** → Application rejected with reason; can reapply
- **REVALIDATION DUE** → Annual renewal required; click to start renewal
- **REVOKED** → Permit revoked by Ministry for non-compliance

---

## Cross-Role Features

### Notifications & Alerts

| Event                 | Recipient(s)                      | Channel                      |
| --------------------- | --------------------------------- | ---------------------------- |
| Application submitted | HOD (department), Finance Officer | Email + SMS                  |
| Inspection scheduled  | Applicant, Field Inspector        | Email + SMS                  |
| Inspection completed  | HOD (department), Commissioner/PS | Email                        |
| Permit issued         | Applicant, Finance Officer        | Email + SMS                  |
| Payment failed        | Applicant, Finance Officer        | Email + SMS                  |
| Payment successful    | Applicant, Finance Officer        | Email + SMS                  |
| SLA breach            | HOD, Permanent Secretary          | Email + SMS (urgent)         |
| System alert          | Permanent Secretary, ISCE Lead    | Email + SMS (urgent)         |
| Annual renewal due    | Applicant, HOD (department)       | Email + SMS (60 days before) |

### Audit Logging

Every user action is logged immutably:

- **Who:** User ID, role, name
- **What:** Action type (viewed, created, approved, rejected, etc.)
- **When:** Timestamp (ISO 8601, WAT timezone)
- **Where:** Module, application ID, record ID
- **Why:** Associated business event (submitted, approved, revoked, etc.)

All audit logs are accessible only to Permanent Secretary, Commissioner, and ISCE Lead.

---

## Role Assignment Workflow

### Ministry Staff Onboarding

1. Permanent Secretary or admin creates Ministry user account
2. Assigns role (Commissioner, PS, HOD, Field Inspector, VIO, Finance Officer)
3. Role determines access to modules and features
4. User receives email with temporary password; forced password change on first login
5. Two-factor authentication (2FA) required for all Ministry staff

### External Applicant Registration

1. Applicant visits public registration page
2. Enters ASIN (Anambra State Identification Number) or email
3. Verifies phone/email via SMS or email OTP
4. Creates password (must meet complexity requirements)
5. Completes profile: business/personal details
6. Confirms role (Park Owner, Mass Transit Company, Driving School, Individual)
7. Account ready to apply for services

---

## Data Access & Privacy

### Row-Level Security (RLS)

- Ministry staff can only view/edit applications within their department/role scope
- Applicants can only view/edit their own applications
- Finance Officers can view all payments but cannot edit applicant details
- Permanent Secretary can view everything; can edit any record (with audit trail)

### Sensitive Data Masking

- Applicants cannot see HOD notes/flags
- HODs cannot see Commissioner's private decisions before finalization
- Finance Officers see payment details; cannot see inspection notes

### Data Retention

- All records retained per Ministry policy (to be defined in PRD Q-6)
- Audit logs retained minimum 7 years (compliance standard)
- Applicants can download their own records; cannot delete

---

## Training & Onboarding

### Role-Specific Training Materials

| Role                    | Training Topics                                                            | Duration |
| ----------------------- | -------------------------------------------------------------------------- | -------- |
| **Commissioner**        | Dashboard overview, approval workflow, policy configuration                | 2 hours  |
| **Permanent Secretary** | All admin functions, staff management, system configuration                | 4 hours  |
| **HOD**                 | Queue management, inspection scheduling, SLA monitoring, staff supervision | 3 hours  |
| **Field Inspector**     | Mobile form entry, checklist completion, photo upload, SLA management      | 2 hours  |
| **Finance Officer**     | Payment tracking, reconciliation, reporting, Paystack integration          | 2 hours  |
| **VIO**                 | AVIR form workflow, vehicle assessment, towing dispatch                    | 2 hours  |
| **External Applicant**  | Self-service, available via help center + video tutorial                   | 30 min   |

### Ongoing Support

- Help center (FAQ, video tutorials, troubleshooting guides)
- Email support: support@mot.anambra.gov.ng (ISCE Support Team)
- Phone support: +234 XXX XXXX XXX (Ministry IT)
- Slack/Teams channel for critical issues (Ministry staff only)

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Next Review:** Week 2 (after Phase 1 implementation starts)
