```markdown
## Feature: Staff Onboarding for Approved Motor Parks

### Overview
Approved motor parks can onboard their staff through the platform. Each onboarded
staff member gets a verifiable digital profile, a unique park-scoped serial number,
and a security code — all tied to a downloadable/printable ID card asset.

---

### User Story
> As an approved motor park operator, I want to onboard my staff so that each staff
> member has a verifiable digital identity linked to my park.

---

### Core Requirements

#### 1. Staff Onboarding Form
- Only **approved motor parks** can access this feature
- Collect sufficient staff information to build a profile (name, role, photo, contact, etc.)
- On submission, the system automatically:
  - Creates a **staff profile**
  - Generates a **unique URL** for the staff profile
  - Generates a **QR code** linked to that URL

---

#### 2. Staff Profile & Verification
- The generated URL/QR code resolves to a **public-facing staff profile page**
- When the QR code is scanned (or NFC tag tapped), it displays:
  - Staff name, photo, role
  - Park they belong to
  - Verification badge / status
- This serves as **proof of legitimacy** — confirms the staff member is verified
  under the Ministry of Transportation

---

#### 3. Park-Scoped Serial Number
- Each staff member gets a **serial number scoped to their park**
- Format: sequential per park — `0001`, `0002`, `0003` ...
- This serial is unique **within** the park, not globally
- Purpose: identify which park a staff member belongs to

---

#### 4. Security Code (Park Identity Pattern)
- Each staff record carries a **security code** that encodes park identity
- Format:
  ```
  MOT-[PARKNAME]-[NUMBER]
  ```
  **Examples:**
  ```
  MOT-OWERRICENTRAL-0001
  MOT-OWERRICENTRAL-0002
  MOT-AWKAOUTH-0001
  ```
- Any staff with a code matching this pattern can be traced back to their specific park
- Acts as a tamper-evident identifier for enforcement/verification officers

---

#### 5. ID Card Asset (Printable / Downloadable)
- Staff should be able to **download or view** their ID card asset
- This asset should be print-ready (for vests, lanyards, or cards)
- Must include at minimum:
  - Staff name & photo
  - Park name
  - Serial number
  - Security code
  - QR code

---

### Data Model (Suggested Fields)

| Field | Description |
|---|---|
| `staffId` | System-generated UUID |
| `parkId` | FK → approved motor park |
| `parkSerialNumber` | Sequential number scoped to park e.g. `0001` |
| `securityCode` | `MOT-[PARKNAME]-[NUMBER]` |
| `profileUrl` | Auto-generated public URL |
| `qrCode` | Generated QR pointing to `profileUrl` |
| `name` | Full name of staff |
| `role` | Staff designation |
| `photo` | Passport photo |
| `status` | `active` \| `suspended` \| `inactive` |
| `createdAt` | Timestamp |

---

### Flow Summary

```
Park Operator fills Staff Onboarding Form
        ↓
System creates Staff Profile
        ↓
Auto-generates: profileUrl + QR Code + Serial Number + Security Code
        ↓
Staff Profile Page is live and publicly verifiable
        ↓
Staff / Operator downloads printable ID card asset
        ↓
QR on vest/card → scanned → shows verified staff profile
```

---

### Acceptance Criteria
- [ ] Only approved parks can access the staff onboarding module
- [ ] Each staff submission creates a profile with a unique URL
- [ ] QR code resolves to the correct staff profile when scanned
- [ ] Serial numbers are scoped per park and increment correctly
- [ ] Security code follows the `MOT-[PARKNAME]-[NUMBER]` format
- [ ] ID card asset is downloadable and print-ready
- [ ] Profile page is publicly accessible without login
```