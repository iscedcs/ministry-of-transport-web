/**
 * Edit Staff User — Ministry of Transport Platform
 * STORY-081 | EPIC-005 | FR-003
 *
 * Permanent Secretary / System Admin edits a staff account's role and details.
 */

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateStaffUser } from "@/app/actions/admin";
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
import type { StaffUser } from "@/app/actions/admin";

import { STAFF_ROLE_OPTIONS as STAFF_ROLES } from "@/lib/utils/labels";

const DEPARTMENTS = [
  { value: "parks", label: "Parks Department" },
  { value: "vis", label: "Vehicle Inspection Services" },
  { value: "transport-ops", label: "Transport Operations" },
  { value: "parks-revalidation", label: "Parks Revalidation Services" },
  { value: "finance", label: "Finance" },
  { value: "administration", label: "Administration" },
];

export function EditStaffForm({ user }: { user: StaffUser }) {
  const [state, formAction, isPending] = useActionState(updateStaffUser, {
    success: false,
    error: "",
  });

  return (
    <div className="flex flex-col gap-6 max-w-lg">
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
          <span className="text-foreground">
            {user.firstName} {user.lastName}
          </span>
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
            Edit Staff Account
          </h1>
        </div>
      </div>

      {state.success && (
        <div className="text-sm text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
          Changes saved successfully.
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={user.id} />

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
                  defaultValue={user.firstName}
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
                  defaultValue={user.lastName}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email (read-only)</Label>
              <Input
                id="email"
                value={user.email ?? ""}
                disabled
                className="opacity-60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Role & Assignment</CardTitle>
            <CardDescription>
              Changing role takes effect immediately
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
                defaultValue={user.role}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                defaultValue={user.designation ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                name="departmentId"
                defaultValue={user.departmentId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">None / Not applicable</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
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
                defaultValue={user.stationLocation ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        {state.success === false && state.error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/users">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
