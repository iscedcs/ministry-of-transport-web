# Revalidation Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Revalidation" service to allow applicants to apply for revalidation of motor parks, terminals, and transport facilities, with applications routed to the HOD of Revalidation for official processing and inspection.

**Architecture:** We will create a new `RevalidationApplication` Prisma model to capture the 9 sections of the 2026 Revalidation Form. We will add a multi-step wizard application flow for the `EXTERNAL_APPLICANT` under `app/(dashboard)/revalidation/apply/page.tsx`, storing draft state in a `RevalidationDraft` model. We will expose the service in the `lib/service-config.ts` configuration, allowing it to appear on the applicant dashboard alongside Motor Parks and Mass Transit.

**Tech Stack:** Next.js (App Router), Prisma, Server Actions, Tailwind CSS, Lucide React

---

### Task 1: Database Schema Updates

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Revalidation Models**

Modify `prisma/schema.prisma` to include `RevalidationDraft` and `RevalidationApplication` models, and update `Application` constraints if needed.

```prisma
model RevalidationDraft {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stepReached Int      @default(1)
  data        Json
  updatedAt   DateTime @updatedAt
}

model RevalidationApplication {
  id String @id @default(cuid())

  // SECTION A: APPLICANT DETAILS
  ownerName             String
  ownershipType         String   @db.VarChar(50)
  cacRegistrationNumber String?
  representativeName    String
  designation           String
  phoneNumber           String
  alternatePhoneNumber  String?
  emailAddress          String
  residentialAddress    String   @db.Text

  // SECTION B: ASIN DETAILS
  asinNumber            String   @unique
  nin                   String
  tin                   String?
  revalidationNumber    String?  @unique // Assigned later

  // SECTION C: MOTOR PARK INFORMATION
  parkName              String
  facilityType          String   @db.VarChar(50) // Public, Private, Loading Bay
  physicalLocation      String   @db.Text
  townCommunity         String
  lga                   String

  // SECTION D: OPERATIONAL INFORMATION
  yearEstablished       String
  operationalStatus     String   @db.VarChar(50)
  dailyVehiclesCount    String   @db.VarChar(50)
  vehicleTypes          String   @db.Text // JSON array or comma-separated

  // SECTION E: FACILITIES AVAILABLE (JSON)
  facilitiesAvailable   Json

  // SECTION F: REGULATORY COMPLIANCE
  existingApprovalNum   String?
  maintainsManifest     Boolean
  operatorsRegistered   Boolean
  paymentsUpToDate      Boolean
  safetySignages        Boolean
  pendingSanctions      Boolean
  sanctionDetails       String?  @db.Text

  // SECTION G: EMPLOYMENT & SECURITY DATA
  managementStaffCount  Int      @default(0)
  adminStaffCount       Int      @default(0)
  securityStaffCount    Int      @default(0)
  otherStaffCount       Int      @default(0)
  securityArrangement   String   @db.VarChar(50)

  // SECTION H: REVENUE INFORMATION
  estimatedDailyRevenue Int // in kobo
  estimatedMonthlyRev   Int // in kobo
  revenueCollectionMethod String @db.VarChar(50)

  // DOCUMENT
  passportPhotoUrl      String?  @db.VarChar(500)
  passportPhotoId       String?

  // SYSTEM & TRACKING
  applicantUserId       String
  status                ApplicationStatus @default(SUBMITTED)

  // INSPECTION & APPROVAL (Official Use)
  inspectionDate        DateTime?
  inspectionOfficerId   String?
  findings              String?  @db.Text
  recommendation        String?  @db.VarChar(50)
  validUntil            DateTime?
  approvedAt            DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  applicant             User     @relation("RevalidationApplicant", fields: [applicantUserId], references: [id])
  inspectionOfficer     User?    @relation("RevalidationInspector", fields: [inspectionOfficerId], references: [id])

  @@index([applicantUserId])
  @@index([status])
}
```

Also, update `User` model to add the reverse relations:
```prisma
  revalidationApps     RevalidationApplication[] @relation("RevalidationApplicant")
  inspectedRevalidations RevalidationApplication[] @relation("RevalidationInspector")
```

- [ ] **Step 2: Generate and Run Prisma Migration**

Run: `pnpm dlx prisma migrate dev --name add_revalidation_models`
Expected: Migration successful and client generated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add RevalidationApplication and Draft models"
```

### Task 2: Service Configuration

**Files:**
- Modify: `lib/service-config.ts`

- [ ] **Step 1: Update configuration types and lists**

Update `lib/service-config.ts`:

```typescript
import { FileBadge } from "lucide-react"; // Or another appropriate icon

export type ServiceKey = "MOTOR_PARK" | "MASS_TRANSIT" | "REVALIDATION";

// Add to APPLICANT_SERVICE_CARDS array:
  {
    id: "REVALIDATION",
    title: "Revalidation Services",
    description: "Revalidation for public & private motor parks, terminals, loading bays, and transport facilities.",
    icon: FileBadge, // Make sure to import this
    route: "/dashboard/services/revalidation",
  },

// Add to SERVICE_LABELS:
export const SERVICE_LABELS: Record<ServiceKey, string> = {
  MOTOR_PARK: "Motor Park",
  MASS_TRANSIT: "Mass Transit",
  REVALIDATION: "Revalidation",
};

// Add to SERVICE_ROOT_ROUTES:
export const SERVICE_ROOT_ROUTES: Record<ServiceKey, string> = {
  MOTOR_PARK: "/motor-parks",
  MASS_TRANSIT: "/fleet-operators",
  REVALIDATION: "/revalidation",
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/service-config.ts
git commit -m "feat: add REVALIDATION to service config"
```

### Task 3: Draft Server Actions

**Files:**
- Create: `app/actions/revalidation-draft.ts`

- [ ] **Step 1: Implement draft actions**

Create `app/actions/revalidation-draft.ts` to manage the multi-step form state.

```typescript
"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type RevalidationDraftData = {
  ownerName: string;
  ownershipType: string;
  cacRegistrationNumber: string;
  representativeName: string;
  designation: string;
  phoneNumber: string;
  alternatePhoneNumber: string;
  emailAddress: string;
  residentialAddress: string;
  asinNumber: string;
  nin: string;
  tin: string;
  parkName: string;
  facilityType: string;
  physicalLocation: string;
  townCommunity: string;
  lga: string;
  yearEstablished: string;
  operationalStatus: string;
  dailyVehiclesCount: string;
  vehicleTypes: string[];
  facilitiesAvailable: Record<string, boolean>;
  existingApprovalNum: string;
  maintainsManifest: boolean;
  operatorsRegistered: boolean;
  paymentsUpToDate: boolean;
  safetySignages: boolean;
  pendingSanctions: boolean;
  sanctionDetails: string;
  managementStaffCount: string;
  adminStaffCount: string;
  securityStaffCount: string;
  otherStaffCount: string;
  securityArrangement: string;
  estimatedDailyRevenue: string;
  estimatedMonthlyRev: string;
  revenueCollectionMethod: string;
  passportPhotoId: string;
  passportPhotoUrl: string;
};

export async function loadRevalidationDraft() {
  const session = await getSession();
  if (!session) return null;

  const draft = await db.revalidationDraft.findUnique({
    where: { userId: session.userId },
  });

  if (!draft) return null;

  return {
    stepReached: draft.stepReached,
    data: draft.data as unknown as RevalidationDraftData,
  };
}

export async function saveRevalidationDraft(step: number, data: Partial<RevalidationDraftData>) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await db.revalidationDraft.upsert({
    where: { userId: session.userId },
    update: { stepReached: step, data: data as any },
    create: { userId: session.userId, stepReached: step, data: data as any },
  });
}

export async function clearRevalidationDraft() {
  const session = await getSession();
  if (!session) return;
  await db.revalidationDraft.deleteMany({
    where: { userId: session.userId },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/revalidation-draft.ts
git commit -m "feat: add server actions for revalidation draft"
```

### Task 4: Submission Server Actions

**Files:**
- Create: `app/actions/revalidation.ts`

- [ ] **Step 1: Implement application submission logic**

Create `app/actions/revalidation.ts` to parse FormData and save the final application.

```typescript
"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function submitRevalidationApplication(_prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const app = await db.revalidationApplication.create({
      data: {
        applicantUserId: session.userId,
        ownerName: formData.get("ownerName") as string,
        ownershipType: formData.get("ownershipType") as string,
        cacRegistrationNumber: formData.get("cacRegistrationNumber") as string || null,
        representativeName: formData.get("representativeName") as string,
        designation: formData.get("designation") as string,
        phoneNumber: formData.get("phoneNumber") as string,
        alternatePhoneNumber: formData.get("alternatePhoneNumber") as string || null,
        emailAddress: formData.get("emailAddress") as string,
        residentialAddress: formData.get("residentialAddress") as string,
        asinNumber: formData.get("asinNumber") as string,
        nin: formData.get("nin") as string,
        tin: formData.get("tin") as string || null,
        parkName: formData.get("parkName") as string,
        facilityType: formData.get("facilityType") as string,
        physicalLocation: formData.get("physicalLocation") as string,
        townCommunity: formData.get("townCommunity") as string,
        lga: formData.get("lga") as string,
        yearEstablished: formData.get("yearEstablished") as string,
        operationalStatus: formData.get("operationalStatus") as string,
        dailyVehiclesCount: formData.get("dailyVehiclesCount") as string,
        vehicleTypes: formData.get("vehicleTypes") as string,
        facilitiesAvailable: JSON.parse(formData.get("facilitiesAvailable") as string || "{}"),
        existingApprovalNum: formData.get("existingApprovalNum") as string || null,
        maintainsManifest: formData.get("maintainsManifest") === "true",
        operatorsRegistered: formData.get("operatorsRegistered") === "true",
        paymentsUpToDate: formData.get("paymentsUpToDate") === "true",
        safetySignages: formData.get("safetySignages") === "true",
        pendingSanctions: formData.get("pendingSanctions") === "true",
        sanctionDetails: formData.get("sanctionDetails") as string || null,
        managementStaffCount: parseInt(formData.get("managementStaffCount") as string || "0"),
        adminStaffCount: parseInt(formData.get("adminStaffCount") as string || "0"),
        securityStaffCount: parseInt(formData.get("securityStaffCount") as string || "0"),
        otherStaffCount: parseInt(formData.get("otherStaffCount") as string || "0"),
        securityArrangement: formData.get("securityArrangement") as string,
        estimatedDailyRevenue: parseInt(formData.get("estimatedDailyRevenue") as string || "0") * 100,
        estimatedMonthlyRev: parseInt(formData.get("estimatedMonthlyRev") as string || "0") * 100,
        revenueCollectionMethod: formData.get("revenueCollectionMethod") as string,
        passportPhotoId: formData.get("passportPhotoId") as string || null,
        passportPhotoUrl: formData.get("passportPhotoUrl") as string || null,
      }
    });

    return { success: true, data: { applicationId: app.id } };
  } catch (error: any) {
    console.error("Failed to submit revalidation:", error);
    return { success: false, error: "Failed to submit application. Please check your inputs." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/revalidation.ts
git commit -m "feat: add revalidation application submission action"
```

### Task 5: Application Wizard UI (Part 1 - Boilerplate & Steps 1-2)

**Files:**
- Create: `app/(dashboard)/revalidation/apply/page.tsx`

- [ ] **Step 1: Create wizard shell and first steps**

Create the page with state management, `StepProgress`, and fields for "Owner Details" and "Business Info" mapped from Sections A & B.

(Implementation will follow the pattern of `motor-parks/apply/page.tsx` but adapted for the Revalidation draft types. Needs a 4-5 step structure).

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/revalidation/apply/page.tsx
git commit -m "feat: add revalidation wizard shell and initial steps"
```

### Task 6: Application Wizard UI (Part 2 - Remaining Steps & Submit)

**Files:**
- Modify: `app/(dashboard)/revalidation/apply/page.tsx`

- [ ] **Step 1: Add final steps and submit handler**

Add steps for:
- Park Info & Operations (Sections C & D)
- Facilities & Compliance (Sections E & F)
- Staff, Revenue & Documents (Sections G, H & Passport upload)
Call `submitRevalidationApplication` using `FormData`. Render the success screen.

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/revalidation/apply/page.tsx
git commit -m "feat: complete revalidation wizard steps and submission"
```

### Task 7: Revalidation Dashboard Listing

**Files:**
- Create: `app/(dashboard)/revalidation/page.tsx`

- [ ] **Step 1: Add simple list page**

Create a page that queries `db.revalidationApplication.findMany({ where: { applicantUserId: session.userId } })` and displays a table or list of the user's revalidation applications. Include a "New Application" button pointing to `/revalidation/apply`.

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/revalidation/page.tsx
git commit -m "feat: add revalidation dashboard list"
```

### Task 8: HOD Revalidation Queue

**Files:**
- Create: `app/(dashboard)/admin/revalidation-queue/page.tsx` (or similar suitable location for the HOD view)

- [ ] **Step 1: Add HOD Queue**

Create a page accessible to `HOD_PARKS_REVALIDATION` or `COMMISSIONER` that lists all submitted revalidation applications and allows clicking into them to view details or add inspection/official use data.

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/admin/revalidation-queue/page.tsx
git commit -m "feat: add HOD revalidation queue view"
```
