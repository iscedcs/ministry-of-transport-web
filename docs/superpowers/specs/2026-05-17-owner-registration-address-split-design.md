# Design Spec: Owner Registration & Application Form Improvements

**Date:** 2026-05-17
**Report reference:** Weekly Project Report May 11–15, 2026 — Items 1 & 2
**Status:** Approved for implementation

---

## Overview

This spec covers two related improvements driven by the May 14–15 review:

1. **Owner registration** — collect `residentialAddress`, make `phone` required and unique.
2. **Application forms** — split Park Location into structured fields; expand Park Manager with residential address and next of kin; prepend an "Owner Details" review step to both the Motor Park and Mass Transit application wizards.

---

## Scope

In scope:
- `prisma/schema.prisma` — two model changes (User, MotorPark)
- `app/actions/auth.ts` — registration schema, duplicate checks, `getMyProfile()`
- `app/(auth)/register/page.tsx` — form UI
- `app/actions/motor-park-draft.ts` — DraftData type
- `lib/validation-schemas.ts` — motorParkApplicationSchema
- `app/actions/motor-park.ts` — submitParkApplication
- `app/(dashboard)/motor-parks/apply/page.tsx` — 5-step wizard
- `app/(dashboard)/fleet-operators/apply/page.tsx` — prepend owner details step

Out of scope (future items):
- Mass Transit address split (terminal location)
- Park Manager as a separate model/entity
- Profile edit page

---

## Section 1 — Database Schema Changes

### 1.1 User model

Add one optional field for personal residential address:

```prisma
model User {
  // ... existing fields ...
  residentialAddress  String?  @db.Text   // Personal/home address (applicants only)
}
```

### 1.2 MotorPark model

**Remove:**
```prisma
locationAddress  String  @db.Text
```

**Add (park location — all required):**
```prisma
streetAddress  String          // e.g. "12 Zik Avenue"
lga            String          // e.g. "Awka South"
townCity       String          // e.g. "Awka"
```

**Add (park manager expansion — all optional):**
```prisma
managerResidentialAddress  String?  @db.Text   // Manager's home address (stored as combined string)
nextOfKinName              String?             // Next of kin full name
nextOfKinPhone             String?             // Next of kin phone (Nigerian format)
```

> **Note:** The Park Manager residential address is split into three sub-fields (street, LGA, city) in the UI only. On submit they are concatenated into a single string (e.g. `"12 Park Road, Awka South LGA, Awka"`) and stored in the single `managerResidentialAddress` column. This avoids unnecessary DB columns for an optional field.

**Add index on `lga`** (enables Commissioner "search by LGA" in item 8 of the report):
```prisma
@@index([lga])
```

---

## Section 2 — Registration Changes

### 2.1 Schema (`externalRegisterSchema` in `app/actions/auth.ts`)

| Field | Before | After |
|-------|--------|-------|
| `phone` | optional | **required**, Nigerian phone format |
| `residentialAddress` | — | **required**, min 5 chars |

### 2.2 Duplicate checks (`registerApplicant`)

Expand the `findFirst` OR clause:

```ts
where: { OR: [{ email }, { asinNumber }, { phone }] }
```

Return specific error messages:
- `email` taken → `"An account with this email already exists"`
- `asinNumber` taken → `"This ASIN number is already registered"`
- `phone` taken → `"A phone number with this number already exists"` (shown on the phone field)

### 2.3 `db.user.create` — add new field

```ts
data: {
  // ... existing ...
  phone,                  // now guaranteed non-null
  residentialAddress,
}
```

### 2.4 Registration form UI (`app/(auth)/register/page.tsx`)

- Phone field: remove "(optional)" label suffix, add `required` attribute
- Add `<Textarea>` for residential address **below phone**, above ASIN:
  - Label: `"Residential / Home Address"`
  - Placeholder: `"House/flat number, street, area, LGA, city"`
  - `rows={3}`, `required`
  - Validated inline (field error below)
- `RegisterFields` type adds `residentialAddress?: string`

---

## Section 3 — Motor Park Application Wizard

### 3.1 Steps (was 4, now 5)

| Step | Label | What changed |
|------|-------|-------------|
| 1 | Owner Details | **NEW** — pre-filled from user profile, all fields disabled |
| 2 | Business Details | unchanged |
| 3 | Park Location | `locationAddress` → `streetAddress` + `lga` + `townCity` |
| 4 | Park Manager | add `managerResidentialAddress` (split: street + LGA + city) + `nextOfKinName` + `nextOfKinPhone` (both optional) |
| 5 | Documents | unchanged |

### 3.2 Owner Details step (Step 1)

- On wizard mount, call `getMyProfile()` server action.
- Render disabled fields: First name, Last name, Email, Phone, Residential Address.
- Show info callout: *"These are your registered account details. Update them from your profile settings before applying if needed."*
- "Continue" button is always enabled on Step 1 (no validation needed — data comes from account).

### 3.3 Park Location step (Step 3)

Three separate fields replacing the single address input:

| Field | Label | Required | Validation |
|-------|-------|----------|-----------|
| `streetAddress` | Street Address | ✅ | min 5 chars |
| `lga` | LGA | ✅ | min 2 chars |
| `townCity` | Town / City | ✅ | min 2 chars |

`streetAddress` is full-width. `lga` and `townCity` side-by-side (2-col grid on sm+).

### 3.4 Park Manager step (Step 4)

Additional fields added after existing contactPerson/Phone/Email:

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `managerStreetAddress` | Manager Street Address | ❌ | part of residential address |
| `managerLga` | Manager LGA | ❌ | part of residential address |
| `managerTownCity` | Manager Town / City | ❌ | part of residential address |
| `nextOfKinName` | Next of Kin Name | ❌ | full name |
| `nextOfKinPhone` | Next of Kin Phone | ❌ | Nigerian format if provided |

The three manager address fields are grouped under a sub-label `"Manager Residential Address"`.
Next of kin fields are grouped under `"Next of Kin"` with a `(optional)` label.

Cross-field validation: if any manager address field is filled, all three are required together.

### 3.5 DraftData type (`app/actions/motor-park-draft.ts`)

```ts
export interface DraftData {
  businessName: string;
  transportCompanyName: string;
  cacRegistrationNumber: string;
  anssidNumber: string;
  // replaces locationAddress:
  streetAddress: string;
  lga: string;
  townCity: string;
  gpsCoordinates: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  // new manager fields:
  managerStreetAddress: string;
  managerLga: string;
  managerTownCity: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  cacDocumentId: string;
  cacDocumentUrl: string;
  cacDocumentName: string;
}
```

### 3.6 Validation schema (`lib/validation-schemas.ts`)

Replace in `motorParkApplicationSchema`:

```ts
// remove:
locationAddress: z.string().min(10).max(500),

// add:
streetAddress: z.string().min(5, "Street address required").max(200),
lga: z.string().min(2, "LGA required").max(100),
townCity: z.string().min(2, "Town/city required").max(100),

// add optional manager fields:
managerResidentialAddress: z.string().max(500).optional(),
nextOfKinName: z.string().max(100).optional(),
nextOfKinPhone: z.string().regex(PHONE_REGEX).optional().or(z.literal("")),
```

### 3.7 Server action (`app/actions/motor-park.ts` — `submitParkApplication`)

Update `raw` extraction and `db.motorPark.create` to use the three new location fields and three new manager fields. The `locationAddress` reference is removed entirely.

Also update `listMotorParks` display (use `streetAddress + ", " + lga + " LGA, " + townCity` where a display string is needed).

---

## Section 4 — Mass Transit Application Wizard

**Only change at this stage:** prepend the same "Owner Details" Step 1 (identical behaviour to Section 3.2).

All existing Mass Transit steps shift up by one. No data model changes to `MassTransitCompany` in this sprint.

---

## Section 5 — New Server Action: `getMyProfile()`

Add to `app/actions/auth.ts`:

```ts
export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  residentialAddress: string | null;
};

export async function getMyProfile(): Promise<ActionResult<UserProfile>> {
  const session = await requireAuth();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true, email: true, phone: true, residentialAddress: true },
  });
  if (!user) return { success: false, error: "User not found" };
  return { success: true, data: user };
}
```

---

## Section 6 — Migration Plan

One Prisma migration (`add_residential_address_split_park_location`):

1. Add `residentialAddress` to `User` (nullable — existing records have null).
2. Add `streetAddress`, `lga`, `townCity` to `MotorPark` — initially nullable during migration, then set `NOT NULL` after backfill.
3. Add `managerResidentialAddress`, `nextOfKinName`, `nextOfKinPhone` to `MotorPark` (all nullable).
4. Backfill: `streetAddress = locationAddress`, `lga = ''`, `townCity = ''` for any existing rows (dev/staging only — no prod data yet).
5. Drop `locationAddress` column.
6. Add `@@index([lga])` on `MotorPark`.

---

## Section 7 — Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Phone already registered | Field-level error on `phone` during registration |
| `getMyProfile()` fails | Apply wizard shows inline error + retry button; does not block navigation |
| Manager address partially filled | Per-field validation error on the empty sibling fields |
| Next of kin phone invalid format | Field-level error; field is optional so error only shows if value is non-empty |

---

## Files Changed Summary

| File | Change type |
|------|------------|
| `prisma/schema.prisma` | Schema changes |
| `app/actions/auth.ts` | Registration schema, duplicate check, `getMyProfile()` |
| `app/(auth)/register/page.tsx` | UI — phone required, add residential address textarea |
| `app/actions/motor-park-draft.ts` | DraftData interface update |
| `lib/validation-schemas.ts` | motorParkApplicationSchema update |
| `app/actions/motor-park.ts` | submitParkApplication update |
| `app/(dashboard)/motor-parks/apply/page.tsx` | 5-step wizard rewrite |
| `app/(dashboard)/fleet-operators/apply/page.tsx` | Prepend owner details step |
