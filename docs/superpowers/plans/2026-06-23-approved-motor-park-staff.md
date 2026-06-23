# Approved Motor Park Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow approved motor parks to onboard their staff, generating verifiable digital profiles, park-scoped serial numbers, security codes, and printable ID cards for each staff member.

**Architecture:** We will introduce a new `ParkStaff` Prisma model linked to `MotorPark`. We'll build a management dashboard for the park operator to add staff and generate ID cards, and a public verification page `/verify/park-staff/[id]` that anyone scanning the QR code can view.

**Tech Stack:** Next.js (App Router), Prisma, Tailwind CSS.

---

### Task 1: Prisma Schema Update

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ParkStaffStatus` enum and `ParkStaff` model**

```prisma
enum ParkStaffStatus {
  ACTIVE
  SUSPENDED
  INACTIVE
}

model ParkStaff {
  id               String          @id @default(cuid())
  motorParkId      String
  parkSerialNumber Int             // Sequential number scoped to park e.g. 1, 2, 3
  securityCode     String          @unique // e.g. MOT-[PARKNAME]-[NUMBER]
  profileUrl       String
  qrCodeUrl        String?         @db.VarChar(500)
  name             String
  role             String
  photoUrl         String?         @db.VarChar(500)
  status           ParkStaffStatus @default(ACTIVE)
  
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  motorPark        MotorPark       @relation(fields: [motorParkId], references: [id], onDelete: Cascade)

  @@unique([motorParkId, parkSerialNumber])
  @@index([securityCode])
  @@index([motorParkId])
}
```

- [ ] **Step 2: Add relation to `MotorPark` model**

```prisma
// Inside model MotorPark
  parkStaff     ParkStaff[]
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ParkStaff model to schema"
```

---

### Task 2: Staff Server Actions

**Files:**
- Create: `app/actions/park-staff.ts`

- [ ] **Step 1: Write `onboardParkStaff` action**

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function onboardParkStaff(data: {
  motorParkId: string;
  name: string;
  role: string;
  photoUrl: string;
}) {
  try {
    const park = await db.motorPark.findUnique({
      where: { id: data.motorParkId },
      select: { id: true, businessName: true, applicationStatus: true },
    });

    if (!park || park.applicationStatus !== "APPROVED") {
      return { success: false, error: "Only approved motor parks can onboard staff." };
    }

    // Determine next serial number
    const maxSerial = await db.parkStaff.aggregate({
      where: { motorParkId: park.id },
      _max: { parkSerialNumber: true },
    });
    
    const nextSerial = (maxSerial._max.parkSerialNumber || 0) + 1;
    const formattedSerial = nextSerial.toString().padStart(4, '0');
    
    // Create security code
    const safeParkName = park.businessName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 15);
    const securityCode = `MOT-${safeParkName}-${formattedSerial}`;

    const staff = await db.parkStaff.create({
      data: {
        motorParkId: park.id,
        parkSerialNumber: nextSerial,
        securityCode,
        name: data.name,
        role: data.role,
        photoUrl: data.photoUrl,
        profileUrl: "", // Will update after getting ID
      },
    });

    // Update with actual profile URL
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8150'}/verify/park-staff/${staff.id}`;
    
    // Simple QR generation using an external service for now (or standard lib)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;

    await db.parkStaff.update({
      where: { id: staff.id },
      data: { profileUrl, qrCodeUrl },
    });

    revalidatePath(`/motor-parks/${park.id}/staff`);
    return { success: true, data: staff.id };
  } catch (error: any) {
    console.error("Staff Onboarding Error:", error);
    return { success: false, error: "Failed to onboard staff" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/park-staff.ts
git commit -m "feat: add park staff onboarding server action"
```

---

### Task 3: Park Operator Staff Management UI

**Files:**
- Create: `app/(dashboard)/motor-parks/[id]/staff/page.tsx`
- Create: `app/(dashboard)/motor-parks/[id]/staff/new/page.tsx`
- Create: `components/park-staff/onboard-staff-form.tsx`

- [ ] **Step 1: Create Staff List Page**

```tsx
// app/(dashboard)/motor-parks/[id]/staff/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ParkStaffListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const park = await db.motorPark.findUnique({
    where: { id },
    include: { parkStaff: { orderBy: { parkSerialNumber: 'asc' } } }
  });

  if (!park || park.applicationStatus !== "APPROVED") notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Staff Directory</h1>
          <p className="text-muted-foreground">{park.businessName}</p>
        </div>
        <Button asChild>
          <Link href={`/motor-parks/${id}/staff/new`}>Onboard New Staff</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {park.parkStaff.map(staff => (
          <div key={staff.id} className="border p-4 rounded-xl flex items-center gap-4">
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted" />
            )}
            <div>
              <p className="font-bold">{staff.name}</p>
              <p className="text-sm text-muted-foreground">{staff.role}</p>
              <p className="text-xs font-mono mt-1 bg-secondary inline-block px-1 rounded">{staff.securityCode}</p>
            </div>
            <div className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={`/motor-parks/${id}/staff/${staff.id}/id-card`}>ID Card</Link>
              </Button>
            </div>
          </div>
        ))}
        {park.parkStaff.length === 0 && (
          <p className="text-muted-foreground col-span-3 py-8 text-center">No staff members onboarded yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Onboarding Form Component**

```tsx
// components/park-staff/onboard-staff-form.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboardParkStaff } from "@/app/actions/park-staff";

export function OnboardStaffForm({ parkId }: { parkId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    
    // In reality, upload photo to object storage first. 
    // Assuming we have a mock URL for now.
    const res = await onboardParkStaff({
      motorParkId: parkId,
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      photoUrl: "https://isce-image.fra1.digitaloceanspaces.com/mot-anambra-cac-documents/passports/default.jpg", // Placeholder
    });

    if (res.success) {
      router.push(`/motor-parks/${parkId}/staff`);
    } else {
      alert(res.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="text-sm font-medium">Full Name</label>
        <Input name="name" required placeholder="John Doe" />
      </div>
      <div>
        <label className="text-sm font-medium">Role</label>
        <Input name="role" required placeholder="Ticketer, Manager, Driver..." />
      </div>
      <Button disabled={loading}>{loading ? "Onboarding..." : "Onboard Staff"}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Create New Staff Page**

```tsx
// app/(dashboard)/motor-parks/[id]/staff/new/page.tsx
import { OnboardStaffForm } from "@/components/park-staff/onboard-staff-form";

export default async function NewStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboard New Staff</h1>
        <p className="text-muted-foreground">Add a new verified staff member to your park.</p>
      </div>
      <OnboardStaffForm parkId={id} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/motor-parks components/park-staff
git commit -m "feat: park operator staff management UI"
```

---

### Task 4: Staff ID Card Asset UI

**Files:**
- Create: `app/(dashboard)/motor-parks/[id]/staff/[staffId]/id-card/page.tsx`

- [ ] **Step 1: Build printable ID Card View**

```tsx
// app/(dashboard)/motor-parks/[id]/staff/[staffId]/id-card/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function StaffIdCardPage({ params }: { params: Promise<{ id: string, staffId: string }> }) {
  const { id, staffId } = await params;
  
  const staff = await db.parkStaff.findUnique({
    where: { id: staffId },
    include: { motorPark: true }
  });

  if (!staff || staff.motorParkId !== id) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold">Staff ID Card</h1>
        <Button onClick={() => window.print()}>Print ID Card</Button>
      </div>

      <div className="w-[300px] h-[450px] border-2 border-primary rounded-xl overflow-hidden shadow-lg mx-auto bg-white text-black print:shadow-none flex flex-col relative">
        <div className="bg-primary text-primary-foreground p-4 text-center">
          <h2 className="font-bold uppercase leading-tight">Ministry of Transport</h2>
          <p className="text-xs uppercase opacity-90">Anambra State</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center pt-6 px-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 border-2 border-primary mb-4">
            {staff.photoUrl && <img src={staff.photoUrl} className="w-full h-full object-cover" alt="Profile" />}
          </div>
          
          <h3 className="font-bold text-xl uppercase text-center">{staff.name}</h3>
          <p className="text-sm text-primary font-semibold uppercase tracking-wider">{staff.role}</p>
          
          <div className="w-full bg-gray-100 p-2 rounded mt-4 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Motor Park</p>
            <p className="font-semibold text-sm line-clamp-1">{staff.motorPark.businessName}</p>
          </div>
          
          <div className="mt-auto mb-4 flex gap-4 w-full items-end justify-between px-2">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Security Code</p>
              <p className="font-mono text-sm font-bold">{staff.securityCode}</p>
            </div>
            {staff.qrCodeUrl && (
              <img src={staff.qrCodeUrl} className="w-16 h-16" alt="Verification QR" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/motor-parks
git commit -m "feat: printable staff ID card view"
```

---

### Task 5: Public Verification Page

**Files:**
- Create: `app/(public)/verify/park-staff/[id]/page.tsx`

- [ ] **Step 1: Create Verification UI**

```tsx
// app/(public)/verify/park-staff/[id]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function VerifyParkStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const staff = await db.parkStaff.findUnique({
    where: { id },
    include: { motorPark: true }
  });

  if (!staff) notFound();

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-green-600 p-6 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold">Verified Staff Profile</h1>
          <p className="text-sm text-green-100">Ministry of Transport, Anambra State</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          {staff.photoUrl ? (
            <img src={staff.photoUrl} alt={staff.name} className="w-32 h-32 rounded-full border-4 border-background -mt-20 shadow-lg object-cover" />
          ) : (
             <div className="w-32 h-32 rounded-full border-4 border-background -mt-20 shadow-lg bg-muted flex items-center justify-center text-3xl font-bold">
               {staff.name[0]}
             </div>
          )}

          <h2 className="text-2xl font-bold mt-4 text-center">{staff.name}</h2>
          <Badge variant="outline" className="mt-2 text-sm">{staff.role}</Badge>

          <div className="w-full space-y-4 mt-8">
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Status</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                {staff.status}
              </Badge>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Motor Park</span>
              <span className="font-medium text-right max-w-[60%]">{staff.motorPark.businessName}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Security Code</span>
              <span className="font-mono font-medium">{staff.securityCode}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground text-sm">Serial No.</span>
              <span className="font-mono font-medium">{staff.parkSerialNumber.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/verify
git commit -m "feat: public park staff verification page"
```
