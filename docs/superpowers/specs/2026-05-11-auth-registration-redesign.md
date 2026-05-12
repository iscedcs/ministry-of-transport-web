# Auth & Registration Redesign — Design Spec

**Date:** 2026-05-11  
**Status:** Approved — ready for implementation  
**Trigger:** Post-deployment test feedback requiring UX and auth flow corrections

---

## 1. Problem Statement

Test conducted on the deployed platform revealed four issues:

1. Applicants should not use passwords — authentication must be passwordless (email + ASIN)
2. The login page has no password visibility toggle (eye icon) for staff
3. The landing page service cards are static — registration must begin from a selected service
4. Applicant dashboards are not scoped — applicants see unrelated services

---

## 2. Scope

| Area | Change |
|---|---|
| `/login` | Replace with applicant-only passwordless form (email + ASIN) |
| `/staff/login` | New page — staff login with email + password + eye toggle |
| `/register` | Remove password fields; accept `service` query param |
| `/register/motor-park` | New requirements/terms page before registration |
| `/register/mass-transit` | New requirements/terms page before registration |
| `app/page.tsx` | Service cards become active links; non-live ones marked "Coming Soon" |
| `app/actions/auth.ts` | New `loginApplicant` action; guard on existing `login` |
| `prisma/schema.prisma` | Add `registeredService` field on `User` |
| Dashboard sidebar | Scope nav items to applicant's registered service |

---

## 3. Authentication

### 3.1 Applicant Login — `/login`

**Fields:**
- Email address
- ASIN Number (6–16 numeric digits)

**Logic (`loginApplicant` server action):**
1. Validate email + ASIN format with Zod
2. Look up user by email
3. Reject if `role !== EXTERNAL_APPLICANT` — "Use the staff login page"
4. Reject if `asinNumber !== input.asin` — "Invalid email or ASIN"
5. Reject if `isActive === false` — "Account is inactive"
6. Create session (same JWT shape as existing `login`)
7. Redirect to `/dashboard`

**Footer:** "Ministry staff? [Sign in here →](/staff/login)"

### 3.2 Staff Login — `/staff/login`

**Fields:**
- Email address
- Password (with show/hide eye toggle — `useState` on the client)

**Logic:** Existing `login` server action, unchanged except:
- Add guard: reject if user's role is `EXTERNAL_APPLICANT` — "Applicants must use the applicant sign-in page"

**Footer:** "Applicant? [Sign in here →](/login)"  
**Forgot password link:** Present, links to `/forgot-password`

### 3.3 ASIN Validation Rule Change

Update everywhere ASIN is validated (register form + new login form):

```
Old: exactly 16 digits
New: 6–16 numeric digits (numbers only, no fixed length)
```

Zod rule: `z.string().regex(/^\d{6,16}$/, "ASIN must be 6–16 digits")`

---

## 4. Service-Specific Registration

### 4.1 Landing Page Service Cards

Active (clickable → requirements page):
- **Motor Park Management** → `/register/motor-park`
- **Mass Transit Registration** → `/register/mass-transit`

Inactive (coming soon — visually indicated, not linked):
- Revenue and Payments
- Ministry Administration
- VIS Inspection
- Accident Reporting (AVIR)
- Driving School Registration
- Certificate Workflow Engine

The existing commented-out "Create Account" hero button stays commented out.

### 4.2 Requirements Pages

Both pages share the same layout component. Content differs per service.

**Structure:**
```
/register/motor-park
  ├── Header: "Motor Park Registration — Requirements"
  ├── Ministry seal + Commissioner signature note
  ├── Section: Required Documents (checklist)
  ├── Section: Site Standards (from parks-standard.md)
  ├── Section: Application Process (numbered steps)
  ├── Section: Terms & Conditions
  ├── Checkbox: "I have read and agree to all requirements"
  └── Button: "Continue to Register →" (disabled until checked)
       └── navigates to /register?service=motor-park
```

```
/register/mass-transit
  ├── Header: "Mass Transit Registration — Requirements"
  ├── Ministry seal + Commissioner signature note
  ├── Section: Eligibility (min 5 vehicles)
  ├── Section: Required Documents (checklist from mass-transit-requirement.md)
  ├── Section: Fleet & Vehicle Rules
  ├── Section: Payment Notice (one-off application fee)
  ├── Section: Terms & Conditions
  ├── Checkbox: "I have read and agree to all requirements"
  └── Button: "Continue to Register →" (disabled until checked)
       └── navigates to /register?service=mass-transit
```

Both are **server components** for SEO; only the checkbox + button need client interactivity (one small `"use client"` sub-component).

### 4.3 Registration Form — `/register?service=...`

**Fields:**
- First name
- Last name
- Email address
- Phone number (optional)
- ASIN Number (6–16 digits, numeric)
- `service` — hidden input from URL param

**Removed fields:** Password, Confirm Password

**`registerApplicant` action changes:**
- Accept `service` from FormData (`"motor-park"` | `"mass-transit"`)
- Map to enum: `"motor-park"` → `"MOTOR_PARK"`, `"mass-transit"` → `"MASS_TRANSIT"`
- Store in `user.registeredService`
- Do NOT create a password hash (field becomes optional)
- Redirect to `/login` with success message

**Validation:** If `service` param is missing or invalid → redirect to `/` (can't register without choosing a service)

---

## 5. Schema Change

```prisma
model User {
  // ... existing fields ...
  registeredService String? // "MOTOR_PARK" | "MASS_TRANSIT" — set on applicant registration; null for staff
}
```

`passwordHash` field becomes optional (`String?`) — applicants have no password; staff always have one.

---

## 6. Applicant Dashboard Scoping

### 6.1 Sidebar Nav — Applicants

Read `registeredService` from the session or a lightweight user fetch on layout load.

| registeredService | Sidebar shows |
|---|---|
| `MOTOR_PARK` | My Motor Parks, Payments |
| `MASS_TRANSIT` | My Fleet, Payments |
| `null` (staff) | Full nav as today |

### 6.2 "Add Another Service" Card

- Shown at the bottom of the applicant dashboard
- Links to `/services` — a page listing active services (Motor Park, Mass Transit)
- Services already registered are shown as "Active" (not re-selectable)
- For Phase 1: only two services available — both links go through the requirements → register flow with service pre-associated
- Sidebar updates after second service is added

### 6.3 Resume Application Banner

- If the applicant has an `Application` record with status not in `[ACTIVE, APPROVED, REJECTED, REVOKED]`, show a banner: "You have an application in progress. [Continue →]"
- Links directly to the relevant detail page

---

## 7. Out of Scope (Phase 2)

- Multi-service `UserService` join table (for now `registeredService` is a string field)
- Forgot ASIN / ASIN recovery flow
- Email verification on registration
- 2FA for applicants (staff 2FA is STORY-008, separate)

---

## 8. Files Affected

| File | Action |
|---|---|
| `app/(auth)/login/page.tsx` | Replace with passwordless applicant form |
| `app/(auth)/staff/login/page.tsx` | New — staff login with password + eye toggle |
| `app/(auth)/register/page.tsx` | Remove password fields; add hidden service field |
| `app/(auth)/register/motor-park/page.tsx` | New — requirements page |
| `app/(auth)/register/mass-transit/page.tsx` | New — requirements page |
| `app/page.tsx` | Service cards → active links + coming soon badges |
| `app/actions/auth.ts` | Add `loginApplicant`; update `registerApplicant`; guard `login` |
| `prisma/schema.prisma` | Add `registeredService String?`; make `passwordHash` optional |
| `app/(dashboard)/sidebar.tsx` | Scope nav to `registeredService` for applicants |
| `middleware.ts` | Update public route list (`/staff/login`, `/register/motor-park`, `/register/mass-transit`) |
