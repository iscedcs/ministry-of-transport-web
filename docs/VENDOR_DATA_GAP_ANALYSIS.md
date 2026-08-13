# Motor Park Data — Field Comparison

**Source:** `allmotorparks.json` shared by the previous vendor
**Volume:** 264 park records, 289 branch entries
**Captured by:** 7 agent accounts (`agent`, `agent1`, `agent2`, `agent3`, `agent0`, `agent04`, `admin`)
**Latest application date:** 2026-08-07

The form serial is `ASI-MOT-RVF-2026/...` — **RVF = Revalidation Form**. Their
records follow the same section structure as the Ministry's revalidation form,
so the two datasets line up closely. What follows is field by field.

---

## 0. WHAT THEY ACTUALLY SENT — table inventory

They shared **one export**, covering motor parks. From its structure we can
identify three tables in their system:

| # | Their table | Rows | Columns | Useful to us? |
|---|---|---|---|---|
| 1 | **Motor parks** (main record) | 264 | 48 | **Yes — this is the valuable one.** Maps to our Motor Park and Revalidation Application records |
| 2 | **Branches** (sub-locations, linked by `park_id`) | 289 | 13 | **Partly.** 234 of 248 single-branch entries are duplicates of the parent park. Only ~15 parks have genuine branches |
| 3 | **Agents / users** (implied by `username`) | 7 accounts | not sent | **No.** Only the agent's login name appears. Useful as provenance, nothing more |

### Table 1 — Motor parks (48 columns)

Grouped by what they represent:

- **Record keeping (5):** `id`, `username`, `formSerialNumber`,
  `dateOfApplication`, `asin`
- **Owner (8):** `ownerName`, `ownershipType`, `cacRegistrationNumber`,
  `designation`, `phoneNumber`, `alternatePhoneNumber`, `emailAddress`,
  `residentialAddress`
- **Tax identity (3):** `asinNumber`, `nin`, `tin`
- **Park details (6):** `motorParkName`, `facilityType`, `serviceTypes`,
  `physicalLocation`, `townCommunity`, `lga`
- **Operations (5):** `routes`, `yearEstablished`, `operationalStatus`,
  `vehiclesPerDay`, `vehicleTypes`
- **Facilities (11):** `perimeterFence`, `securityPost`, `toiletFacilities`,
  `boreholeWater`, `passengerWaitingArea`, `fireExtinguishers`,
  `cctvCameras`, `solarStreetLights`, `ticketingPoint`,
  `managerAdminOffice`, `safetySignagesInstalled`
- **Staff & security (5):** `managementStaff`, `administrativeStaff`,
  `securityPersonnel`, `othersStaff`, `securityArrangement`
- **Compliance (1):** `revenueUpToDate`
- **Repeated columns (4):** `organizationYearEstablished`,
  `overallOperationalStatus`, `totalVehiclesPerDay`, `globalVehicleTypes` —
  these repeat four columns already listed above (see §3)

### Table 2 — Branches (13 columns)

`id`, `park_id`, `name`, `facilityType`, `serviceTypes`, `physicalLocation`,
`townCommunity`, `lga`, `routes`, `yearEstablished`, `operationalStatus`,
`vehiclesPerDay`, `vehicleTypes`

Worth noting: the branch rows store LGA as a **name** ("Idemili North") while
the parent park stores it as a **code** ("10"). That inconsistency is what
allowed us to reconstruct their LGA code table (§4).

### What their export does NOT include

Our system runs on 41 tables. Their export touches **2 of them**. There is no
sign in the file of any of the following — either their system does not hold
this data, or it was not included in what they sent:

| Area | Tables we have with no counterpart in their export |
|---|---|
| Documents & photos | Document, Document Review |
| Park staff | Park Staff, Park Monitor Application |
| Inspections | Inspection, Inspection Checklist (3 tables) |
| Payments & fees | Payment, Payment Receipt, Revenue, Motor Park Fee, Fee Schedule |
| User accounts | User, Session |
| Notifications | Notification, Notification Template, Notification Preference |
| Audit history | Audit Log |
| Mass transit | Mass Transit Company, Terminal, Vehicle, Driver, Vehicle QR Code |
| TRACAS | TRACAS Vehicle, TRACAS Driver, TRACAS Sticker |
| Maritime | Boat, Boat Rider, Boat Sticker |

**The question worth putting to them:** is the motor park export everything
they hold, or do they also have payment records, inspection records,
uploaded documents and owner accounts that simply were not part of this
share? Payments and documents in particular would be significant if they
exist.

---

## 1. MATCHES — what they sent that we can use directly

### Section A — Applicant details

| Their field | Our field | Filled |
|---|---|---|
| `ownerName` | `ownerName` | 264 / 264 (100%) |
| `ownershipType` | `ownershipType` | 262 (99%) |
| `cacRegistrationNumber` | `cacRegistrationNumber` | 94 (36%) |
| `designation` | `designation` | 205 (78%) |
| `phoneNumber` | `phoneNumber` | 262 (99%) |
| `alternatePhoneNumber` | `alternatePhoneNumber` | 172 (65%) |
| `emailAddress` | `emailAddress` | 162 (61%) |
| `residentialAddress` | `residentialAddress` | 234 (89%) |

### Section B — ASIN details

| Their field | Our field | Filled |
|---|---|---|
| `asinNumber` | `asinNumber` | 264 (100%) |
| `nin` | `nin` | 196 (74%) |
| `tin` | `tin` | 62 (24%) |

### Section C — Park information

| Their field | Our field | Filled |
|---|---|---|
| `motorParkName` | `parkName` | 262 (99%) |
| `facilityType` | `facilityType` | 260 (99%) |
| `physicalLocation` | `physicalLocation` | 259 (98%) |
| `townCommunity` | `townCommunity` | 244 (92%) |
| `lga` | `lga` | 259 (98%) — sent as numeric codes, see §4 |

### Section D — Operational information

| Their field | Our field | Filled |
|---|---|---|
| `yearEstablished` | `yearEstablished` | 165 (63%) |
| `operationalStatus` | `operationalStatus` | 256 (97%) |
| `vehiclesPerDay` | `dailyVehiclesCount` | 199 (75%) |
| `vehicleTypes` | `vehicleTypes` | 243 (92%) |

### Section E — Facilities available

All eleven facility questions came through complete, 264/264 as Yes/No:

`perimeterFence`, `securityPost`, `toiletFacilities`, `boreholeWater`,
`passengerWaitingArea`, `fireExtinguishers`, `cctvCameras`,
`solarStreetLights`, `ticketingPoint`, `managerAdminOffice`,
`safetySignagesInstalled`

This is the most complete section in the dataset.

### Section G — Employment & security

| Their field | Our field | Filled |
|---|---|---|
| `managementStaff` | `managementStaffCount` | 264 (100%) |
| `administrativeStaff` | `adminStaffCount` | 264 (100%) |
| `securityPersonnel` | `securityStaffCount` | 264 (100%) |
| `othersStaff` | `otherStaffCount` | 264 (100%) |
| `securityArrangement` | `securityArrangement` | 226 (86%) |

All four staff counts are clean whole numbers — no invalid entries.

---

## 2. MISSING — what our form requires that they did not send

### Section H — Revenue information (entirely absent)

Not one of the three fields appears anywhere in the file:

- **Estimated daily revenue**
- **Estimated monthly revenue**
- **Revenue collection method**

All three are mandatory on our form.

### Section F — Regulatory compliance (4 of 6 missing)

Present: payments up to date, safety signages installed.

Missing:

- **Existing approval / permit number**
- **Does the park maintain a passenger manifest?**
- **Are operators registered with the Ministry?**
- **Any pending sanctions?** (and sanction details)

### Applicant identity

- **Representative name** — no field for it. They sent `designation`
  ("Manager", "Chairman", "Igwe") but never the person's name, and
  `ownerName` holds the business name in 65 records rather than a person.
- **Next of kin** — name and phone, both absent.

### Documents — none supplied

No file, photo or scan of any kind:

- Passport photograph of the owner/representative
- CAC certificate
- Land ownership document
- Corporate ASIN document
- Facility photographs (toilet, waiting area, signage, water)

### Location precision

- **GPS coordinates** — absent. `physicalLocation` is descriptive prose
  ("Fenced Vinas Road Ogidi"), which cannot be mapped.

### System

- **Owner login accounts** — the file records only which *agent* captured each
  form, never an account for the park owner. Owners cannot sign in, track an
  application, or receive notices until accounts exist. **102 of 264 records
  have no email address at all**, so an account cannot be created for them
  without the Ministry collecting contacts.
- **Payment / fee records** — no assessed fee, no monthly levy, no payment
  history.
- **Inspection records** — no inspection date, officer, findings or outcome.
- **Approval trail** — no indication that any record was reviewed or approved
  by anyone. All 264 are, in effect, raw submissions.

---

## 3. EXTRA — what they have that we have no field for

| Their field | What it holds | Note |
|---|---|---|
| `serviceTypes` | Inter-State, Intra-State, Buses, Keke, Logistics, Cargo, Luxury Bus | 243 records. Useful — recommend we add it |
| `routes` | Route strings, e.g. "Nnewi – Kwara State" | Sparse but genuinely useful |
| `branches` | Nested sub-locations, 289 total | See below |
| `formSerialNumber` | Their paper form serial, `ASI-MOT-RVF-2026/XXXX` | Worth keeping for traceability |
| `dateOfApplication` | Date the form was captured | Maps to our `appliedAt` |
| `username` | Which agent captured the record | Worth keeping as provenance |
| `id` | Their internal record ID | Keep for reconciliation |

**On `branches`:** 289 branch entries across 264 parks, but **234 of the 248
single-branch parks are simply a copy of the parent record** — same name, same
location. Only about 15 parks have genuine multi-site structure (one has
seven). We have no branch concept today; the near-duplicates would need to be
collapsed on import.

**Duplicated fields in their own file:** `asin` repeats `asinNumber`,
`organizationYearEstablished` repeats `yearEstablished`,
`overallOperationalStatus` repeats `operationalStatus`,
`totalVehiclesPerDay` repeats `vehiclesPerDay`, and `globalVehicleTypes`
repeats `vehicleTypes`. Where the pairs disagree we need to know which is
authoritative — `totalVehiclesPerDay` disagrees in 18 records and is the more
complete of the two.

---

## 4. DATA QUALITY — points needing clarification

**LGA sent as numeric codes.** Park-level `lga` is `"20"`, `"21"`, `"14"` and
so on, with no code table supplied. We were able to recover the mapping from
the branch records, which carry LGA names:

| | | | |
|---|---|---|---|
| 1 = Aguata | 2 = Awka North | 3 = Awka South | 4 = Anambra East |
| 5 = Anambra West | 6 = Anaocha | 10 = Idemili North | 11 = Idemili South |
| 12 = Ihiala | 13 = Njikoka | 14 = Nnewi North | 16 = Orumba North |
| 17 = Orumba South | 18 = Oyi | 19 = Ogbaru | 20 = Onitsha South |
| 21 = Onitsha North | | | |

Please confirm this table is correct. Around 8 records are internally
inconsistent (code 20 appears against Awka South, Aguata and Nnewi North as
well as Onitsha South).

**Three records are outside Anambra State** — Amuwo Odofin, Oshodi-Isolo and
Lagos Mainland. Presumably Lagos terminals of Anambra operators. Please
confirm whether these belong in the State register.

**ASIN format.** 162 of 264 ASIN numbers are not 11 digits — lengths vary
between 10 and 12, and several look like system timestamps rather than issued
ASINs. Please confirm the correct format, or these will need re-verification
against the ANSSID register.

**Three records appear to be test entries** — ASIN `ASIN123456` with serials
`ASN-2026-0001`, `ASN-2026-0041`, `ASN-2026-4201`. Please confirm they should
be excluded.

**Possible duplicates.** 25 form serial numbers appear more than once.
"ABC Transport Main Terminal" appears 3 times and "Ihiala Motor Park" twice.
Please advise whether these are true duplicates or genuinely separate parks.

**Other gaps:** `yearEstablished` blank in 99 records (38%); 7 phone numbers
are malformed; 1 email address has no `@`; `facilityType` is blank in 4
records and reads "Motor Park" in 3 (not one of the three values our form
uses: Private, Public, Loading Bay).

---

## 5. SUMMARY

Sections A, B, C, D, E and G came through in good shape and can be loaded.

Section H is missing entirely, Section F is two-thirds missing, and no
documents or photographs were supplied. Those gaps are the ones that need a
decision — either the vendor supplies the missing data, or the Ministry
collects it during inspection.

**Questions for the Ministry:**

1. Should the missing Section F and H data be requested from the vendor, or
   captured by our inspectors during the revalidation inspection?
2. Should we create owner login accounts for the 161 parks that have an email
   address, and hold the other 102 until contacts are collected?
3. Should all 264 records enter the revalidation queue at once, or be released
   in batches (by LGA, for instance)?
4. Please confirm the LGA code table, the ASIN format, the three Lagos
   records, the three test records, and the possible duplicates.
