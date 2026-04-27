**PRODUCT REQUIREMENTS DOCUMENT**

**Ministry of Transport (Anambra State)**

 

**Integrated Transport Services Automation Platform**

 

| Document Owner | ISCE Digital Concept / Anambra State Ministry of Transport |
| :---- | :---- |
| **Prepared For** | Permanent Secretary, Ministry of Transport, Awka, Anambra State |
| **Document Version** | 2.0 — Updated with Requirements Scoping Session (April 2026\) |
| **Reference** | AN/MOT/40/29 (Park Standards, Sept 2021); Mass Transit Registration Standards; Requirements Scoping Notes (April 2026); AVIR Form No. 0051 |
| **Delivery Model** | Public-Private Partnership (PPP) — Zero Cost to Government |
| **Classification** | Confidential — For Official Use Only |

# **1\. Executive Summary**

ISCE Digital Concept proposes to design, build, deploy, and maintain an Integrated Transport Services Automation Platform for the Anambra State Ministry of Transport (MOT). The platform will consolidate all Ministry service workflows — park approval, mass transit registration, private and commercial vehicle inspection, accident vehicle inspection reporting, driving school registration, revenue collection, and security/towing coordination — into a single web-based application accessible to staff, regulated entities, and the public.

 

The engagement is structured as a Public-Private Partnership (PPP) with zero capital expenditure to the Ministry. ISCE Digital Concept will fund all development and operational costs and recover investment through a revenue-sharing arrangement to be agreed upon contract execution.

 

| Goal | Replace paper-based, multi-step Ministry workflows with a unified digital platform that increases transparency, reduces processing time, enforces regulatory standards, and grows State-Government revenue from transport sector compliance fees. |
| :---: | :---- |

 

# **2\. Background & Context**

## **2.1 Current State**

The Ministry of Transport administers a wide portfolio of regulated services including:

•       Motor park inspection, approval, revalidation, and fee assessment — governed by the Standards for Approving Motor Parks in the State (Ref: AN/MOT/40/29, September 2021\)

•       Mass transit company and fleet-operator registration, vehicle fleet management, driver proficiency cards, and annual permit renewal — governed by the Standards for Registration/Approval of Mass Transit Companies/Fleet Operators in the State

•       Accident Vehicle Inspection Reporting

•       Private cab and ride-hailing registration

•       Logistics service provider registration

 

Based on the documents provided, these processes currently rely on manual application submission, physical site inspections by Ministry teams, paper-based fee payments through the State's PayDirect system, and manual record-keeping. No integrated digital channel exists to consolidate application tracking, document verification, inspection scheduling, or compliance monitoring.

 

## **2.2 Strategic Rationale**

The Ministry's existing regulatory documents define detailed standards, workflows, eligibility criteria, and approval conditions. These well-documented processes make the Ministry's operations well-suited for systematic digitisation. Automation will:

•       Enforce compliance with documented standards at every workflow step

•       Provide a complete, auditable record of all regulated entities and their compliance status

•       Reduce processing bottlenecks caused by sequential, paper-based approvals

•       Increase revenue capture through full visibility of fee obligations and digital payment integration

•       Build on ISCE Digital Concept's existing deployment of the Transpay electronic daily toll system for the Anambra State Government

 

# **3\. Project Objectives**

| \# | Objective | Success Indicator |
| :---- | :---- | :---- |
| O-1 | Digitise park approval and revalidation workflows end-to-end | Zero manual paper applications for park approvals within 12 months of go-live |
| O-2 | Automate mass transit company registration and renewal | All registered fleet operators accessible via the platform with current permit status |
| O-3 | Enable digital fee collection linked to ASIN and State PayDirect accounts | 100% of Ministry-administered fees collected through the platform |
| O-4 | Create a real-time compliance dashboard for Ministry management | Commissioner and Permanent Secretary can view compliance status at any time |
| O-5 | Issue unique digital identifiers (QR codes) to all regulated vehicles and parks | All mass transit vehicles carry Ministry-issued QR codes within 6 months of go-live |
| O-6 | Support expansion to additional service modules post-launch | Platform architecture supports addition of new modules without full re-architecture |

 

# **4\. Scope**

## **4.1 In Scope — Phase 1 (Launch Modules)**

The following service areas are confirmed from the documents provided and are in scope for the first release:

 

### **Module 1: Motor Park Management**

Based on Standards for Approving Motor Parks in the State (AN/MOT/40/29):

•       Online application submission by prospective private park owners

•       Document upload: CAC registration, ANSSID number, land ownership/lease documents, company details

•       Automated routing of application to Parks Inspection and Revalidation Team (HOD Parks, HOD VIS, HOD T.Ops, HOD PRS)

•       Inspection scheduling and inspection report entry by Ministry field teams

•       Issuance of digital 'Permit to Build' by Commissioner/Permanent Secretary

•       Re-inspection request and approval workflow upon completion of park construction

•       Evaluation and recording of monthly/annual Motor Park Fee/Levy

•       Digital approval letter generation with terms and conditions

•       Annual revalidation reminders and renewal workflow

•       Revocation workflow for non-compliance

 

### **Module 2: Mass Transit Company & Fleet Operator Registration**

Based on Standards for Registration/Approval of Mass Transit Companies/Fleet Operators in the State:

•       Online application by mass transit companies and fleet operators

•       Document upload and verification: Certificate of Incorporation, Director's Tax Clearance, passport photographs, ASIN number, Business Premises Certificate, ANSAA Registration Certificate

•       Fleet declaration: vehicle types, models, registration numbers, assigned drivers, telephone contacts, routes, and roadworthiness inspection reports

•       Staff list submission: names, positions, telephone numbers, locations

•       Colour/branding approval workflow

•       Routing to Parks Inspection and Revalidation Team for terminal/depot site inspection (within 5 working days per policy)

•       Digital one-off application fee payment routed to designated State Government PayDirect account via ASIN

•       Ministry document verification workflow

•       Issuance of 'Permit to Operate Certificate' and digital approval letter

•       Annual renewal reminders and renewal workflow

•       Fleet change management: addition/removal of vehicles with Ministry update notification

•       QR code issuance and management for each vehicle in the fleet

•       Driver proficiency card management and renewal

 

### **Module 3: Revenue & Payments**

•       Integration with Anambra State PayDirect system for all fee payments

•       Payment tracking linked to ASIN numbers

•       Automated receipts and payment confirmation

•       Monthly payment schedule management and arrears tracking

•       Revenue reporting dashboard for Ministry finance team

 

### **Module 4: Ministry Administration & Reporting**

•       Role-based user accounts for Ministry staff (Commissioner, Permanent Secretary, HODs, field inspectors, finance)

•       Application queue management and workflow assignment

•       Inspection scheduling calendar for field teams

•       Compliance status registry for all regulated entities

•       Notifications and alerts (inspection due, renewal due, non-compliance flags)

•       Audit trail for all actions taken on the platform

 

### **Module 5: Private & Commercial Vehicle Inspection (VIS Module)**

Based on requirements scoping notes — covers both private and commercial vehicles:

•       Two intake tracks: automated data capture (from computerised VIS centres) and manual form entry by Ministry staff

•       Insurance verification step: company name, certificate/cover note number, date

•       Process 1 — Security track: Nigeria Police Motor Traffic Division form completion, payment processing

•       Process 2 — VIO track: Accident Vehicle Inspection Report generation (linked to Module 6), payment on request

•       Towing coordination: location-based towing van dispatch request

•       Vehicle particulars capture: make, engine number, type, chassis number, identification mark, commercial or private classification, speedometer reading

•       Roadworthiness certificate details: place of issue, date of issue, certification number

 

### **Module 6: Accident Vehicle Inspection Report (AVIR)**

Based on scoping notes and the physical AVIR Form (Govt. of Anambra State, Serial No. 0051):

•       Digital replication of the Accident Vehicle Inspection Report form (Original to Police; Duplicate for Office)

•       Accident reporting trigger: any party (driver, police, public) can initiate an accident report

•       Report form fields: date and time of accident, place of inspection, investigating police officer, Nigeria Police Motor Traffic Division details

•       Vehicle particulars: make, engine number, type, chassis, identification mark, commercial/private, speedometer reading

•       Insurance particulars: insurance company name, certificate/cover note number, date

•       Roadworthiness certificate: place of issue, date of issue, certification number

•       Mechanical/electrical condition BEFORE accident: Engine/Clutch/Gear Box/Back Axle; Brake Equipment/Steering/Suspension; Lights/Horn/Wipers/Direction Indicators/Electrical Circuits; Accessories/Speedometer/Mirror; Road Test

•       Mechanical/electrical condition AFTER/damages: free-text damage assessment

•       Recommended cause of accident and general remarks fields

•       Police reference number, date, date/time police received VIO report, police name and signature

•       Vehicle Inspection Officer sign-off: name, station, date

•       Automatic routing of completed report to Security dashboard and MOT dashboard simultaneously

•       MOT report generation from completed AVIR data

•       Towing van dispatch: location-based quick response request triggered from accident record

 

### **Module 7: Driving School Registration**

Based on requirements scoping notes:

•       Online application by driving schools seeking Ministry registration

•       School details: driving school name, location, contact information

•       Fleet declaration: number of training vehicles

•       Instructor declaration: number of instructors, names, qualifications

•       VIO test application submission for school vehicles

•       Certificate issuance workflow: Temporary Certificate or Permanent Certificate based on assessment outcome

•       Rejection workflow: notification with specific reasons (document not valid or incomplete)

•       Registration fee (fixed) and inspection fee (fixed) collection

 

### **Module 8: Certificate & Registration Workflow Engine**

Based on scoping notes — a common workflow engine that underlies Parks, Mass Transit, and Driving School registration:

•       Application submission

•       Document review stage

•       Assessment decision: Certificate Issued or Rejected

•       If Issued: system offers Temporary Certificate or Permanent Certificate options based on compliance level

•       If Rejected: system generates rejection notice citing specific document invalidity or incompleteness

•       Fee structure enforcement: Registration fee (fixed), Inspection fee (fixed), Parks fee (based on AIRS assessment)

•       Validate parks for Transpay integration: approved parks must be validated on the platform before being linked to the existing Transpay toll system

 

## **4.2 In Scope — Phase 2 (Post-Launch Expansion)**

The following are deferred to Phase 2 pending detailed requirements gathering:

•       Private cab and ride-hailing service registration

•       Logistics service provider registration

•       Public-facing vehicle and park status lookup (for passengers and enforcement)

•       Automated CAC document verification integration

 

## **4.3 Out of Scope**

•       Vehicle registration functions managed by the Vehicle Inspection Service (VIS) or FRSC — the platform will accept VIS inspection reports as uploaded documents but will not replicate VIS functions

•       National driver's licence issuance (FRSC mandate)

•       Integration with national FRSC or FIRS systems (may be explored in a later phase)

•       Management of public motor parks not under Ministry jurisdiction

•       The Transpay toll system (existing, separate deployment)

 

# **5\. Stakeholders**

| Stakeholder | Role | Key Interests |
| :---- | :---- | :---- |
| Honourable Commissioner for Transport | Executive authority; signs approval letters and policy decisions on the platform | Platform reflects policy accurately; Commissioner actions are fast and auditable |
| Permanent Secretary | Operational authority; final approvals delegated by Commissioner; primary Ministry counterpart for the PPP | Process efficiency, revenue visibility, accountability of Ministry staff |
| HOD — Parks | Leads motor park inspection and revalidation team; primary user for park module | Inspection scheduling, checklist enforcement, field team coordination |
| HOD — Vehicle Inspection Services (VIS) | Member of park inspection team; validates vehicle-related standards | Vehicle compliance data, inspection report submission |
| HOD — Transport Operations (T.Ops) | Member of park inspection team; transport flow assessment | Route and operational compliance |
| HOD — Parks Revalidation Services (PRS) | Member of park inspection team; revalidation cycles | Revalidation tracking and fee reassessment |
| Ministry Finance Team | Revenue management; PayDirect reconciliation | Accurate fee tracking, arrears visibility, revenue reports |
| Field Inspectors | Conduct site inspections; enter inspection findings into the platform | Mobile-friendly data entry, clear inspection checklists |
| Private Park Owners (Applicants) | External applicants seeking park approval | Simple application process, status visibility, clear requirements |
| Mass Transit Companies / Fleet Operators | External regulated entities applying for registration and renewal | Straightforward registration, fleet management tools, QR code issuance |
| Driving Schools | External applicants seeking driving school registration and VIO test application | Simple application, certificate status, fee clarity |
| Nigeria Police — Motor Traffic Division | Receives original copy of AVIR; investigating officer details captured on platform | Accurate accident records, timely report access |
| Vehicle Inspection Officers (VIOs) | Complete and sign the Accident Vehicle Inspection Report; enter mechanical assessment findings | Digital form entry, report routing to police and MOT |
| Towing Service Operators | Dispatched via platform for accident vehicle recovery; location-based assignment | Clear dispatch instructions, location accuracy |
| ISCE Digital Concept | Platform developer, operator, and PPP partner | Successful deployment, agreed revenue share, long-term partnership |

 

# **6\. Functional Requirements**

## **6.1 User Registration & Access Control**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-001 | The system shall support role-based access control (RBAC) with distinct roles for: Commissioner, Permanent Secretary, HOD (per department), Field Inspector, Finance Officer, Vehicle Inspection Officer (VIO), Security/Police Liaison, Towing Coordinator, External Applicant (park owner / transit company / driving school) | PPP proposal; Ministry operational structure; scoping notes |
| FR-002 | External applicants (park owners, mass transit companies) shall register using their Anambra State Identification Number (ASIN) as the primary account identifier | Mass Transit Standards; Park Standards |
| FR-003 | Ministry staff accounts shall be provisioned and managed by a designated system administrator role within the Ministry | Operational requirement from proposal |
| FR-004 | All user actions shall be logged with timestamp, user ID, and action type for audit purposes | Transparency and accountability objective |

 

## **6.2 Motor Park Module**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-010 | Applicants shall be able to submit a motor park application online including: business name, transport company name, location, CAC evidence, ANSSID number, land documents, park manager name and contact | Park Standards — Application & Approval Processes |
| FR-011 | The system shall route submitted applications to the Parks Inspection Team (HOD Parks, HOD VIS, HOD T.Ops, HOD PRS) for inspection scheduling | Park Standards — Inspection of Proposed Site |
| FR-012 | The system shall enforce the physical standards checklist during inspection entry: parking arrangement, entrance/exit with gatehouse, paved and fenced land, separate male/female conveniences, water supply, refreshment (non-alcoholic), ticketing office, waiting lounge, manager's office, minimum 2 x 9kg DCP fire extinguishers | Park Standards — Requirements/Standards for Park Approval |
| FR-013 | The system shall enable the Commissioner/Permanent Secretary to issue a digital 'Permit to Build' once the site inspection is approved | Park Standards — Application and Approval Processes |
| FR-014 | Upon applicant-initiated completion notice, the system shall trigger a re-inspection workflow | Park Standards — re-inspection requirement |
| FR-015 | The re-inspection workflow shall evaluate proximity factors: proximity to public park, proximity to major transport route/public road, proximity to major road intersections | Park Standards — re-inspection criteria |
| FR-016 | The system shall support Motor Park Fee/Levy assessment and recording (monthly/annual) | Park Standards — fee evaluation step |
| FR-017 | The system shall generate a digital approval letter containing applicable terms and conditions including annual revalidation requirement | Park Standards — final approval step |
| FR-018 | The system shall send annual revalidation reminders and support the revalidation renewal workflow | Park Standards — annual revalidation |
| FR-019 | The system shall support a revocation workflow for parks that violate terms and conditions or where the applicant misled the Ministry | Park Standards — revocation clause |

 

## **6.3 Mass Transit & Fleet Operator Module**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-020 | Applicants shall submit a mass transit registration application with all required documents: Certificate of Incorporation, Director's Tax Clearance, Director passport photograph, ASIN, office locations, Business Premises Certificate, ANSAA Registration Certificate | Mass Transit Standards — document list |
| FR-021 | The system shall enforce a minimum fleet size of 5 branded vehicles before an application can be submitted | Mass Transit Standards — minimum 5 vehicles |
| FR-022 | Applicants shall declare each vehicle in the fleet including: type, model, registration number, assigned driver name, driver telephone number, routes, and roadworthiness inspection report | Mass Transit Standards — vehicle list requirements |
| FR-023 | The system shall route terminal/depot locations to the Parks Inspection and Revalidation Team for inspection within 5 working days of application endorsement by the Commissioner/Permanent Secretary | Mass Transit Standards — 5-working-day SLA |
| FR-024 | The system shall support digital payment of the one-off application fee to the designated State Government PayDirect account, referenced by the company's ASIN | Mass Transit Standards — payment requirement |
| FR-025 | The system shall manage colour/branding approval workflow for fleet vehicles; all vehicles in a fleet must bear one Ministry-approved brand colour | Mass Transit Standards — uniform branding |
| FR-026 | The system shall generate and assign unique QR codes to each registered vehicle for identification and monitoring by the Ministry | Mass Transit Standards — QR code requirement |
| FR-027 | The system shall issue a digital 'Permit to Operate Certificate' upon approval, renewable annually | Mass Transit Standards — Certificate to Operate |
| FR-028 | Fleet operators shall be able to submit fleet change notifications (additions or removals) through the platform for Ministry update | Mass Transit Standards — fleet change reporting |
| FR-029 | The system shall manage driver proficiency card issuance and annual renewal | Mass Transit Standards — driver proficiency card |
| FR-030 | The system shall record and track monthly payments per company as specified by the Ministry, with applicable revenue codes | Mass Transit Standards — monthly payment requirement |

 

## **6.4 Revenue & Payment Module**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-040 | The system shall integrate with the Anambra State PayDirect system for all fee transactions | Mass Transit Standards; Park Standards — State payment infrastructure |
| FR-041 | All payments shall be linked to the payer's ASIN number | Mass Transit Standards — ASIN-linked payments |
| FR-042 | The system shall generate digital payment receipts and confirmation notices automatically | Accountability and transparency objective |
| FR-043 | The system shall flag overdue monthly payments and generate arrears reports for the Ministry finance team | Revenue objective |
| FR-044 | The system shall provide revenue reports disaggregated by service type (park fees, transit registration fees, renewal fees, etc.) | Reporting objective for Permanent Secretary |

 

## **6.5 Notifications & Communications**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-050 | The system shall send automated notifications to applicants at each stage of the approval workflow (submission confirmed, inspection scheduled, permit issued, etc.) | Transparency objective; applicant experience |
| FR-051 | The system shall send renewal reminder notifications to park owners and fleet operators at least 60 days before permit expiry | Annual revalidation requirement in both regulatory documents |
| FR-052 | The system shall send internal alerts to relevant HODs when inspection SLAs are approaching or have been breached (e.g., 5-day inspection window for mass transit applications) | Mass Transit Standards — 5-working-day SLA |
| FR-053 | Notifications shall be delivered via SMS and/or email; the preferred channel shall be configurable per user | Accessibility given variable internet connectivity |

 

## **6.6 Private & Commercial Vehicle Inspection (VIS Module)**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-060 | The system shall support two data intake modes for vehicle inspection: (1) automated import from computerised VIS inspection centres; (2) manual form entry by Ministry staff | Scoping notes — Private & Commercial VIS flow |
| FR-061 | The system shall capture vehicle particulars during inspection entry: make, engine number, type, chassis number, identification mark, commercial or private classification, speedometer reading | AVIR Form No. 0051 — Vehicle Particulars section |
| FR-062 | The system shall capture insurance particulars: insurance company name, certificate/cover note number, and date | AVIR Form No. 0051 — Insurance Particulars section |
| FR-063 | The system shall capture roadworthiness certificate details: place of issue, date of issue, and certification number | AVIR Form No. 0051 — Roadworthiness Certificate section |
| FR-064 | Process 1 (Security track): the system shall support Nigeria Police Motor Traffic Division form completion and route the completed form to the security dashboard; payment shall be collected at this stage | Scoping notes — Process 1: Security / Police Form / Payment |
| FR-065 | Process 2 (VIO track): the system shall support Accident Vehicle Inspection Report generation (see FR-070 series) and collect payment upon request | Scoping notes — Process 2: VIO / Accident Vehicle Report |
| FR-066 | The system shall support a location-based towing van dispatch request linked to any vehicle inspection or accident record | Scoping notes — Towing: location-based request |

 

## **6.7 Accident Vehicle Inspection Report (AVIR) Module**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-070 | Any user (driver, police officer, Ministry staff) shall be able to initiate an accident report through the platform | Scoping notes — Accident: Report Accident trigger |
| FR-071 | The system shall present the digital Accident Vehicle Inspection Report form replicating all fields from the official Anambra State AVIR Form (Serial No. 0051\) | AVIR Form No. 0051 — full form structure |
| FR-072 | The AVIR form shall capture: date and time of accident, place of inspection and date, investigating police officer name, Nigeria Police Motor Traffic Division station details | AVIR Form No. 0051 — header fields |
| FR-073 | The AVIR form shall capture vehicle particulars: make, engine number, type, chassis number, identification mark, commercial or private, speedometer reading | AVIR Form No. 0051 — Vehicle Particulars |
| FR-074 | The AVIR form shall capture mechanical/electrical condition BEFORE the accident across five assessment categories: (1) Engine, Clutch, Gear Box and Back Axle; (2) Brake Equipment, Steering, Suspension System; (3) Lights, Horn, Wipers, Direction Indicators, Electrical Circuits; (4) Accessories, Speedometer, Mirror, etc.; (5) Road Test | AVIR Form No. 0051 — Mechanical/Electrical Condition Before Accident |
| FR-075 | The AVIR form shall capture mechanical/electrical condition AFTER accident/damages as a free-text assessment field | AVIR Form No. 0051 — Mechanical/Electrical Condition After/Damages |
| FR-076 | The AVIR form shall capture: recommended cause of accident, general remarks, police reference number and date, date and time police received VIO's report, police name and signature | AVIR Form No. 0051 — lower section fields |
| FR-077 | The AVIR form shall capture Vehicle Inspection Officer sign-off: name, station, and date | AVIR Form No. 0051 — VIO signature block |
| FR-078 | Upon submission of a completed AVIR, the system shall simultaneously route the report to the Security dashboard and the MOT dashboard | Scoping notes — Form action to Security & MOT dashboard |
| FR-079 | The system shall enable MOT to generate a consolidated accident report from completed AVIR records, filterable by date range, location, vehicle type, and cause | Scoping notes — MOT generates report |
| FR-080 | The system shall produce two digital copies of each completed AVIR: one routed to the Nigeria Police (Motor Traffic Division) and one retained in the Ministry office records | AVIR Form No. 0051 — Original to Police; Duplicate for Office |
| FR-081 | The system shall support a towing van quick-response dispatch request from any active accident record, with location-based assignment to the nearest available towing unit | Scoping notes — Towing Van for quick response, location-based request |

 

## **6.8 Driving School Registration Module**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-090 | Driving schools shall submit a registration application online including: school name, location, contact details, number of training vehicles, and number of instructors | Scoping notes — Driving School: name, no. of vehicles, no. of instructors |
| FR-091 | The system shall support VIO test application submission for driving school training vehicles as part of the registration process | Scoping notes — VIO test application |
| FR-092 | The system shall apply the common certificate workflow (Module 8): document review, assessment decision, and issuance of either a Temporary Certificate or Permanent Certificate | Scoping notes — Certificate Issue or Rejected workflow |
| FR-093 | If the application is rejected, the system shall generate a rejection notice stating the specific reason: document not valid, or document incomplete | Scoping notes — If reject \= Document not valid or incomplete |
| FR-094 | The system shall collect a fixed registration fee and a fixed inspection fee for driving school applications | Scoping notes — Registration fee Fixed, Inspection fee Fixed |

 

## **6.9 Certificate & Registration Workflow Engine**

| ID | Requirement | Source / Notes |
| :---- | :---- | :---- |
| FR-100 | The platform shall implement a reusable certificate workflow engine applicable to Motor Parks, Mass Transit, and Driving School modules, enforcing the common steps: Application → Document Review → Assessment → Certificate Issued or Rejected | Scoping notes — common workflow across modules |
| FR-101 | When a certificate is issued, the system shall determine the certificate type (Temporary or Permanent) based on configurable Ministry-defined compliance criteria | Scoping notes — If issued \= Either Temp Cert or Perm Cert |
| FR-102 | When an application is rejected, the system shall record and communicate the specific rejection reason: document not valid, or document incomplete | Scoping notes — If reject \= Document not valid or incomplete |
| FR-103 | The fee engine shall support three fee types: (1) Registration fee — fixed amount; (2) Inspection fee — fixed amount; (3) Parks fee — based on AIRS (Anambra Internal Revenue Service) assessment | Scoping notes — fee structure: Fixed / Fixed / Based on Assessment (AIRS) |
| FR-104 | The system shall include a Transpay Validation step for approved parks: before a park is linked to the Transpay toll system, it must be marked as validated on the platform | Scoping notes — Validate parks for Transpay |

 

# **7\. Non-Functional Requirements**

| Category | Requirement |
| :---- | :---- |
| Availability | The platform shall target 99.5% uptime during Ministry business hours (Monday–Friday, 8am–5pm WAT) |
| Performance | Application submission, document upload, and status queries shall complete within 5 seconds under normal load |
| Security | All data in transit shall be encrypted (TLS 1.2 minimum); all stored documents shall be encrypted at rest; access shall require authenticated sessions |
| Data Residency | All Ministry data shall be stored on infrastructure resident in Nigeria or as approved in writing by the Ministry |
| Scalability | The platform shall support expansion to additional service modules (Phase 2 services) without re-architecture of the core platform |
| Accessibility | The public-facing application portal shall function on low-bandwidth connections and be accessible on standard Android mobile browsers |
| Audit Trail | Every action taken by any user (Ministry staff or external applicant) shall be logged with immutable timestamps |
| Backup & Recovery | Data shall be backed up daily; the system shall be recoverable within 4 hours in the event of infrastructure failure |
| Browser Compatibility | The platform shall support the latest two versions of Chrome, Firefox, Edge, and Safari |

 

# **8\. Key Process Workflows**

## **8.1 Motor Park Approval Workflow**

The following steps describe the end-to-end motor park approval process as defined in the Ministry's Standards document, translated into platform workflow states:

 

| Step | Actor | Platform Action | Outcome / State |
| :---- | :---- | :---- | :---- |
| 1 | Park Owner (Applicant) | Submits online application with all required documents | Application status: SUBMITTED |
| 2 | System | Routes application to Inspection Team (HOD Parks, VIS, T.Ops, PRS) | Application status: PENDING INSPECTION |
| 3 | Inspection Team | Schedules and conducts site inspection; enters findings against standards checklist | Inspection report recorded |
| 4 | Commissioner / PS | Reviews inspection report; issues Permit to Build | Application status: PERMIT TO BUILD ISSUED |
| 5 | Park Owner | Builds park to standards; submits completion notice through platform | Application status: COMPLETION NOTICE SUBMITTED |
| 6 | Inspection Team | Re-inspects completed park against full standards; evaluates proximity factors | Re-inspection report recorded |
| 7 | Ministry Finance | Assesses monthly/annual Motor Park Fee/Levy | Fee assessment recorded |
| 8 | Commissioner / PS | (Optional) Confirmatory visit | Confirmatory visit note recorded |
| 9 | Ministry | Issues final approval letter with terms and conditions | Application status: APPROVED; Park record created |
| 10 | System (Annual) | Sends revalidation reminder; triggers renewal workflow | Application status: REVALIDATION DUE |

 

## **8.2 Mass Transit Registration Workflow**

| Step | Actor | Platform Action | Outcome / State |
| :---- | :---- | :---- | :---- |
| 1 | Mass Transit Company | Submits registration application with all documents and full fleet declaration (min. 5 vehicles) | Application status: SUBMITTED |
| 2 | System | Validates minimum fleet size and required document completeness | Validation: PASS or FAIL with specific errors returned to applicant |
| 3 | Commissioner / PS | Endorses application; triggers inspection routing | Application status: ENDORSED |
| 4 | Inspection Team | Inspects terminal/depot locations within 5 working days | Inspection report recorded; SLA timer visible |
| 5 | Ministry Verification Team | Verifies submitted documents and information | Document verification: VERIFIED or FLAGGED |
| 6 | Applicant | Pays one-off application fee via PayDirect (ASIN-referenced) | Payment status: CONFIRMED |
| 7 | VIS / Inspection Centres | Vehicles undergo roadworthiness inspection; reports uploaded | Roadworthiness reports: UPLOADED |
| 8 | Ministry | Reviews all completed steps; approves colour/branding | Branding: APPROVED |
| 9 | System | Generates and issues QR codes for each vehicle; issues Permit to Operate Certificate | Application status: APPROVED; QR codes issued |
| 10 | System (Annual) | Sends renewal reminder; triggers annual renewal workflow | Application status: RENEWAL DUE |

 

## **8.3 Accident Vehicle Inspection Report (AVIR) Workflow**

| Step | Actor | Platform Action | Outcome / State |
| :---- | :---- | :---- | :---- |
| 1 | Reporter (Driver / Police / Public) | Initiates accident report on platform | AVIR status: INITIATED |
| 2 | Reporter | Fills accident report form: date/time, location, vehicle particulars, insurance details, police officer details | AVIR status: FORM IN PROGRESS |
| 3 | Vehicle Inspection Officer (VIO) | Completes mechanical/electrical assessment (before and after accident); enters recommended cause; signs off | AVIR status: VIO ASSESSMENT COMPLETE |
| 4 | System | Routes completed AVIR simultaneously to Security dashboard and MOT dashboard | AVIR status: ROUTED TO SECURITY & MOT |
| 5 | Security / Police | Reviews report; generates Security report; references Police Reference Number | Security report recorded |
| 6 | Applicant / Party | Payment processed for VIO report (on request) | Payment status: CONFIRMED |
| 7 | MOT | Generates consolidated accident report from AVIR data | MOT report: GENERATED |
| 8 | System | Produces two digital copies: Original to Nigeria Police (Motor Traffic Division); Duplicate to Ministry office | AVIR status: FILED |
| 9 | Towing Coordinator (if needed) | Dispatches nearest towing van via location-based request linked to accident record | Towing status: DISPATCHED |

 

## **8.4 Private & Commercial Vehicle Inspection (VIS) Workflow**

| Step | Actor | Platform Action | Outcome / State |
| :---- | :---- | :---- | :---- |
| 1 | Ministry Staff / VIS Centre | Vehicle inspection initiated — automated data import from computerised VIS centre OR manual form entry | Inspection status: IN PROGRESS |
| 2 | VIO / Staff | Vehicle particulars entered: make, engine no., type, chassis, ID mark, classification, speedometer | Vehicle details: RECORDED |
| 3 | VIO / Staff | Insurance particulars verified: company, certificate/cover note number, date | Insurance: VERIFIED or FLAGGED |
| 4 | System | Routes to Process 1 (Security) and/or Process 2 (VIO) based on inspection type | Routing: PROCESS 1 / PROCESS 2 |
| 5a — Process 1 | Security / Police Liaison | Nigeria Police Motor Traffic Division form completed; routed to Security dashboard | Police form: SUBMITTED |
| 5b — Process 1 | Applicant / Party | Payment processed | Payment status: CONFIRMED |
| 5a — Process 2 | VIO | Accident Vehicle Inspection Report generated (triggers AVIR workflow — see 8.3) | AVIR: INITIATED |
| 5b — Process 2 | Applicant / Party | Payment processed on VIO report request | Payment status: CONFIRMED |
| 6 | Towing Coordinator (if needed) | Location-based towing van dispatch request submitted | Towing status: DISPATCHED |

 

## **8.5 Driving School Registration Workflow**

| Step | Actor | Platform Action | Outcome / State |
| :---- | :---- | :---- | :---- |
| 1 | Driving School (Applicant) | Submits online registration application: school name, location, no. of vehicles, no. of instructors, supporting documents | Application status: SUBMITTED |
| 2 | System | Validates document completeness; routes to Ministry review team | Validation: PASS or FAIL |
| 3 | Ministry Review Team | Reviews submitted documents and school details | Application status: UNDER REVIEW |
| 4 | VIO | Conducts VIO test on training vehicles; submits test results | VIO test: COMPLETED |
| 5 | Ministry | Assessment decision: Certificate to be issued or application rejected | Decision: APPROVED or REJECTED |
| 5a — If Approved | System | Issues Temporary Certificate (pending full compliance) OR Permanent Certificate (full compliance); collects registration and inspection fees | Application status: CERTIFICATE ISSUED |
| 5b — If Rejected | System | Issues rejection notice with specific reason: document not valid / document incomplete | Application status: REJECTED — reason stated |
| 6 | System (Annual) | Sends renewal reminder; triggers annual renewal workflow | Application status: RENEWAL DUE |

 

# **9\. Data Requirements**

## **9.1 Core Data Entities**

| Entity | Key Attributes | Source Document |
| :---- | :---- | :---- |
| Motor Park | Park name, location, owner name, ANSSID, CAC number, approval date, fee class, revalidation date, status | Park Standards |
| Mass Transit Company | Company name, ASIN, incorporation number, ANSAA number, head office address, branch offices, approved brand colour, permit number, expiry date, status | Mass Transit Standards |
| Fleet Vehicle | Registration number, type, model, mass transit company (FK), assigned driver (FK), approved routes, roadworthiness certificate, QR code, plate colour (red on white), status | Mass Transit Standards |
| Driver | Name, national driver's licence number, telephone number, proficiency card number, expiry date, assigned vehicles | Mass Transit Standards |
| Application | Application ID, type (park/transit/renewal), applicant (FK), submission date, current status, assigned inspector, SLA deadline, documents (list), fee payments (list) | Both documents |
| Inspection Report | Report ID, application (FK), inspection date, inspector(s), checklist results, proximity assessments, recommendations, outcome | Park Standards; Mass Transit Standards |
| Payment | Payment ID, ASIN, application (FK), fee type, amount, payment date, PayDirect reference, receipt number | Both documents |
| Ministry User | User ID, name, role, department (HOD mapping), contact, active status | Operational requirement |
| Accident Vehicle Inspection Report (AVIR) | AVIR ID, serial number, date/time of accident, place of inspection, investigating police officer, vehicle (FK), insurance company, certificate/cover note number, roadworthiness cert details, mechanical condition before (5 categories), mechanical condition after/damages, recommended cause, general remarks, police reference number, VIO name/station/date, status, copies routed (police / office) | AVIR Form No. 0051 |
| Vehicle Inspection Record | Inspection ID, vehicle (FK), inspection type (private/commercial), intake mode (automated/manual), VIS centre, insurance details, roadworthiness cert, process track (Process 1 Security / Process 2 VIO), payment status, towing request (FK), outcome | Scoping notes — VIS module |
| Driving School | School name, location, contact, number of vehicles, number of instructors, VIO test status, certificate type (Temp/Perm), issue date, expiry date, registration fee payment, inspection fee payment, status | Scoping notes — Driving School module |
| Towing Request | Request ID, linked record (AVIR or inspection FK), request date/time, location coordinates, nearest towing unit assigned, dispatch time, arrival time, status | Scoping notes — Towing Van location-based request |
| Security Report | Report ID, linked AVIR or inspection record (FK), police form details, police reference number, security officer, date, status | Scoping notes — Security report from accident/VIS flow |

 

# **10\. Integration Requirements**

| Integration | Purpose | Direction | Notes |
| :---- | :---- | :---- | :---- |
| Anambra State PayDirect System | All Ministry fee payments processed through this system using ASIN | Outbound (platform initiates payment request); Inbound (payment confirmation) | Existing State infrastructure; integration specs to be obtained from Ministry |
| Computerised Vehicle Inspection Centres | Roadworthiness inspection reports to be submitted for all mass transit vehicles | Inbound (report upload or API) | Mass Transit Standards require mandatory inspection at any computerised centre in the State |
| CAC (Corporate Affairs Commission) | Verify Certificate of Incorporation for park owners and transit companies | Outbound query (optional enhancement) | Documents may initially be accepted as uploads; automated CAC verification is a Phase 2 enhancement |
| SMS Gateway | Notifications and alerts to applicants and Ministry staff | Outbound | Local Nigerian SMS gateway required for delivery reliability |
| Email System | Document-rich notifications; official correspondence copies | Outbound | Ministry to confirm official email domain for outbound messages |
| Nigeria Police — Motor Traffic Division | AVIR original copy routed digitally to police; police reference numbers recorded on platform | Outbound (report delivery); Inbound (reference number confirmation) | Routing mechanism (email/API/portal access) to be agreed with Nigeria Police |
| Transpay Toll System | Parks approved on the platform must be validated before being activated in the existing Transpay system | Outbound (validation signal to Transpay) | ISCE Digital Concept operates both systems; internal API integration feasible |
| Towing Fleet Management | Location-based towing van dispatch from accident and inspection records | Outbound (dispatch request); Inbound (status updates) | Requires GPS-enabled towing units or a towing operator mobile app; scope to be confirmed |

 

# **11\. PPP & Operational Model**

## **11.1 Deployment Model**

Per the proposal, the platform and all associated infrastructure shall be deployed and maintained entirely at no cost to the Ministry. ISCE Digital Concept bears all capital and operational expenditure for development, hosting, maintenance, and support.

 

## **11.2 Revenue Sharing**

The proposal specifies a revenue-sharing formula to be agreed between the Ministry and ISCE Digital Concept prior to contract execution. The following parameters must be defined before development commences:

•       The specific percentage share applicable to each fee category (park fees, registration fees, renewal fees, monthly transit payments)

•       The payment cycle for share remittance to the Ministry

•       The mechanism for audit and reconciliation of shared revenues

•       Treatment of PayDirect transaction costs

 

| ACTION REQUIRED | Revenue sharing formula must be negotiated and documented before contract execution. This is a prerequisite for project initiation. |
| :---: | :---- |

 

## **11.3 Policy Authority**

The Ministry retains full policy authority over all regulatory decisions made on the platform. ISCE Digital Concept is responsible for the platform only. Specifically:

•       All approval, rejection, permit issuance, and revocation actions are performed by authorised Ministry officials through the platform — never by ISCE Digital Concept

•       Regulatory standards, fee schedules, and terms and conditions remain under Ministry control and may be updated through a Ministry-administered configuration process

•       The Ministry will provide policy direction, monitoring, and evaluation of the automation as stated in the proposal

 

## **11.4 Support & SLAs**

The following support commitments are required from ISCE Digital Concept as platform operator. These are to be formalised in the PPP agreement:

| Category | Proposed SLA |
| :---- | :---- |
| Platform Availability | 99.5% uptime during Ministry business hours |
| Critical Bug Resolution | Within 4 business hours of report |
| Standard Bug Resolution | Within 3 business days of report |
| Feature Enhancement Requests | To be scoped and agreed within 10 business days |
| Data Backup | Daily automated backup; 30-day retention minimum |
| Disaster Recovery | System restoration within 4 hours of infrastructure failure |

 

# **12\. Open Questions & Decisions Required**

The following items require decisions from the Ministry before or during project initiation. None have been assumed in this document.

 

| \# | Question | Owner | Impact if Unresolved |
| :---- | :---- | :---- | :---- |
| Q-1 | What is the agreed revenue sharing formula between the Ministry and ISCE Digital Concept? | Ministry / ISCE Digital Concept | Project cannot be formally initiated without this agreement |
| Q-2 | Which Ministry official (Commissioner or Permanent Secretary) has sign-off authority for which specific platform actions? | Ministry | Role and permission configuration cannot be finalised |
| Q-3 | Does the Ministry wish to integrate with CAC for automated document verification at launch, or accept uploaded documents initially? | Ministry | Integration scope and timeline impacts |
| Q-4 | What is the approved State Government PayDirect account and integration contact for fee collection? | Ministry Finance | Payment module cannot be built without this |
| Q-5 | Will the platform be accessible from Ministry-owned devices only, or should it also be accessible on personal devices used by field inspectors? | Ministry IT / PS | Affects security policy and mobile design requirements |
| Q-6 | What is the data retention policy for applications, inspection records, and payment records? | Ministry / Legal | Affects database and storage architecture |
| Q-7 | Which SMS gateway provider does the State Government recommend or mandate for official communications? | Ministry IT | Notification module implementation |
| Q-8 | Are there existing computerised vehicle inspection centres already producing digital reports, or do all reports need to be manually uploaded by applicants? | Ministry VIS / HOD VIS | Affects integration scope for roadworthiness reports |
| Q-9 | What is the Ministry's official email domain to be used for outbound notifications (e.g., noreply@mot.anambra.gov.ng)? | Ministry IT | Email notification configuration |
| Q-10 | Should the platform support Igbo language in addition to English for external applicants? | Ministry / Commissioner | Frontend localisation scope |
| Q-11 | What is the Ministry-defined compliance threshold for issuing a Temporary Certificate versus a Permanent Certificate across Parks, Mass Transit, and Driving School modules? | Ministry / HOD | Certificate workflow engine cannot be configured without this |
| Q-12 | Who within the Ministry administers the AIRS (Anambra Internal Revenue Service) assessment for the Parks fee? Is there an API or data exchange with AIRS? | Ministry Finance / AIRS | Parks fee module configuration and AIRS integration scope |
| Q-13 | How should the Nigeria Police (Motor Traffic Division) receive digital AVIR copies — via a portal login, email delivery, or API push? Does the Nigeria Police have an existing digital infrastructure for this? | Ministry / Nigeria Police | AVIR routing to police cannot be built without this |
| Q-14 | Does the Ministry have an existing towing fleet with GPS tracking capability, or will a new towing operator network need to be established for location-based dispatch? | Ministry / PS | Towing dispatch module scope and feasibility |
| Q-15 | What fee amounts are applicable for the Driving School registration fee and inspection fee? Are these currently fixed by Ministry policy? | Ministry Finance | Driving School fee module configuration |

 

# **13\. Assumptions**

This PRD makes the following minimum assumptions, all of which are based directly on the documents provided. No additional assumptions have been introduced.

•       The regulatory standards documents provided (Park Standards AN/MOT/40/29 and Mass Transit Registration Standards) accurately reflect current Ministry policy and will remain the authoritative basis for platform workflow design.

•       The Anambra State Identification Number (ASIN) is an active, operational identifier assigned to businesses and individuals in Anambra State and can be used as a primary key for applicant identity on the platform.

•       The Anambra State PayDirect system is operational and a technical integration pathway exists for third-party applications.

•       ISCE Digital Concept's existing Transpay deployment confirms ISCE's technical capability and existing working relationship with the Anambra State Government.

•       The Ministry has internal IT or administrative capacity to manage Ministry user accounts and system configuration once the platform is deployed.

 

# **14\. Success Metrics**

| Metric | Baseline (Current) | Target (12 Months Post-Launch) |
| :---- | :---- | :---- |
| Motor park applications processed digitally | 0% | 100% |
| Mass transit registrations processed digitally | 0% | 100% |
| Driving school registrations processed digitally | 0% | 100% |
| Average park application processing time | Not measured (manual) | To be established at go-live; 20% reduction within 12 months |
| Annual revenue from all Ministry fees (digitally collected) | Not tracked on platform | Full visibility of all fee revenue through platform |
| Registered mass transit vehicles with Ministry-issued QR codes | 0 | 100% of registered fleet |
| Annual permit renewals completed on time (before expiry) | Not tracked | 80% of renewals completed before expiry date |
| Accident Vehicle Inspection Reports filed digitally | 0% | 100% of AVIRs filed through platform |
| AVIR copies routed to Police digitally (eliminating paper originals) | 0% | 100% |
| Towing van dispatch requests handled via platform | 0 | All dispatch requests logged on platform |
| Platform uptime during business hours | N/A | 99.5% |

 

# **15\. Document Approval**

This PRD is subject to review and sign-off by the following parties before development commences:

 

| Name / Role | Organisation | Signature | Date |
| :---- | :---- | :---- | :---- |
| Permanent Secretary, Ministry of Transport | Anambra State Ministry of Transport |   |   |
| Honourable Commissioner for Transport | Anambra State Ministry of Transport |   |   |
| Project Lead, ISCE Digital Concept | ISCE Digital Concept |   |   |

 

 

| NOTE | This document was prepared from information contained in the following sources: (1) ISCE Digital Concept proposal to the Permanent Secretary; (2) Standards for Approving Motor Parks in the State (AN/MOT/40/29); (3) Standards for Registration/Approval of Mass Transit Companies/Fleet Operators in the State; (4) Requirements scoping session notes (April 2026\) covering VIS, AVIR, Driving School, and certificate workflow modules; (5) Government of Anambra State Accident Vehicle Inspection Report physical form (Serial No. 0051). No assumptions beyond what is explicitly stated in those sources have been introduced. |
| :---: | :---- |

 

