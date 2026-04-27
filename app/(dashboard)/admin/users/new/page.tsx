/**
 * Provision New Staff Account — Ministry of Transport Platform
 * STORY-080 | EPIC-005 | FR-003
 *
 * Permanent Secretary / System Admin creates Ministry staff accounts.
 * Reuses provisionStaffAccount from auth.ts.
 */

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { provisionStaffAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAFF_ROLES = [
  { value: "COMMISSIONER", label: "Commissioner" },
  { value: "PERMANENT_SECRETARY", label: "Permanent Secretary" },
  { value: "HOD_PARKS", label: "HOD — Parks" },
  { value: "HOD_VIS", label: "HOD — VIS" },
  { value: "HOD_TRANSPORT_OPS", label: "HOD — Transport Operations" },
  { value: "HOD_PARKS_REVALIDATION", label: "HOD — Parks Revalidation" },
  { value: "FIELD_INSPECTOR", label: "Field Inspector" },
  { value: "FINANCE_OFFICER", label: "Finance Officer" },
  { value: "VEHICLE_INSPECTION_OFFICER", label: "Vehicle Inspection Officer" },
  { value: "SYSTEM_ADMIN", label: "System Administrator" },
];

const DEPARTMENTS = [
  { value: "parks", label: "Parks Department" },
  { value: "vis", label: "Vehicle Inspection Services" },
  { value: "transport-ops", label: "Transport Operations" },
  { value: "parks-revalidation", label: "Parks Revalidation Services" },
  { value: "finance", label: "Finance" },
  { value: "administration", label: "Administration" },
];

// Wrap provisionStaffAccount so it can be called from useActionState (prevState, formData)
async function provisionAction(
  prevState: { success: boolean; error?: string } | undefined,
  formData: FormData,
) {
  return provisionStaffAccount({
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as Parameters<
      typeof provisionStaffAccount
    >[0]["role"],
    departmentId: (formData.get("departmentId") as string) || undefined,
    designation: (formData.get("designation") as string) || undefined,
    stationLocation: (formData.get("stationLocation") as string) || undefined,
    temporaryPassword: formData.get("temporaryPassword") as string,
  });
}

export default function NewStaffPage() {
  const [state, formAction, isPending] = useActionState(
    provisionAction,
    undefined,
  );

  if (state?.success) {
    return (
      <div className="max-w-lg">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="text-center">
            <UserPlus className="mx-auto h-10 w-10 text-green-600 mb-2" />
            <CardTitle>Account Created</CardTitle>
            <CardDescription>
              The staff account has been provisioned. Share the temporary
              password securely — the user should change it on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/users">Back to Staff Directory</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/users/new">Add Another</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span>/</span>
          <Link
            href="/admin/users"
            className="hover:text-foreground transition-colors">
            Staff
          </Link>
          <span>/</span>
          <span className="text-foreground">New</span>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Provision Staff Account
          </h1>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  placeholder="Ada"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  placeholder="Okonkwo"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="ada.okonkwo@mot.anambra.gov.ng"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="08012345678"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Role & Assignment</CardTitle>
            <CardDescription>
              Determines what this staff member can see and do
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <select
                id="role"
                name="role"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Select a role…</option>
                {STAFF_ROLES.map((r) => (
                  <option className="bg-primary" key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="designation">Designation / Job Title</Label>
              <Input
                id="designation"
                name="designation"
                placeholder="e.g. Senior Inspector"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                name="departmentId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">None / Not applicable</option>
                {DEPARTMENTS.map((d) => (
                  <option className="bg-primary" key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stationLocation">Station / Location</Label>
              <Input
                id="stationLocation"
                name="stationLocation"
                placeholder="e.g. Awka Central Station"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Temporary Password</CardTitle>
            <CardDescription>
              Share this with the staff member securely. They should change it
              on first login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="temporaryPassword">
                Temporary Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="temporaryPassword"
                name="temporaryPassword"
                type="text"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>

        {state?.error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isPending ? "Creating Account…" : "Create Staff Account"}
        </Button>
      </form>
    </div>
  );
}
