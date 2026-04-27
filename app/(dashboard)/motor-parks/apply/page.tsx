"use client";

/**
 * Motor Park Application Form — Ministry of Transport Platform
 * STORY-021 | FR-010
 *
 * External applicants submit their motor park application.
 * Fields: business name, transport company, location, CAC no., ANSSID no.,
 *         GPS coordinates, contact person, phone, email.
 * Document uploads (land ownership, CAC doc) — deferred to STORY-022.
 */

import { useActionState } from "react";
import Link from "next/link";
import { submitParkApplication } from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ── Field error helper ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {!required && (
          <span className="text-muted-foreground font-normal text-xs ml-1">
            (optional)
          </span>
        )}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

type ApplyState = ActionResult<{ parkId: string }> | undefined;

export default function ApplyMotorParkPage() {
  const [state, action, isPending] = useActionState<ApplyState, FormData>(
    // The server action's first param accepts undefined (initial state)
    submitParkApplication as (
      s: ApplyState,
      f: FormData,
    ) => Promise<ApplyState>,
    undefined,
  );

  // On success, show a success card instead of the form
  if (state?.success) {
    return (
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle
              className="text-xl text-[var(--success-text)]"
              style={{ fontFamily: "var(--font-display)" }}>
              Application Submitted
            </CardTitle>
            <CardDescription>
              Your motor park application has been received and routed to the
              Parks Inspection Team for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              You will be notified by email when an inspection date is
              scheduled. You can track your application status from the Motor
              Parks dashboard.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/motor-parks">View My Applications</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const err = !state?.success
    ? (state as { success: false; error: string } | undefined)
    : undefined;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <span className="text-foreground">New Application</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Motor Park Application
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete all required fields. Your application will be reviewed by the
          Parks Inspection Team (FR-011).
        </p>
      </div>

      {err?.error && (
        <Alert variant="destructive">
          <AlertDescription>{err.error}</AlertDescription>
        </Alert>
      )}

      <form action={action} noValidate className="flex flex-col gap-8">
        {/* Section 1: Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Details</CardTitle>
            <CardDescription>
              Information about the park owner and registered business.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field id="businessName" label="Business / Park Name" required>
              <Input
                id="businessName"
                name="businessName"
                type="text"
                placeholder="e.g. Awka Central Motor Park"
                required
                autoComplete="organization"
              />
            </Field>

            <Field
              id="transportCompanyName"
              label="Transport Company Name"
              hint="If operating under a registered transport company.">
              <Input
                id="transportCompanyName"
                name="transportCompanyName"
                type="text"
                placeholder="e.g. Anambra Express Ltd"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="cacRegistrationNumber"
                label="CAC Registration Number"
                required
                hint="From your Certificate of Incorporation.">
                <Input
                  id="cacRegistrationNumber"
                  name="cacRegistrationNumber"
                  type="text"
                  placeholder="RC 1234567"
                  required
                />
              </Field>

              <Field
                id="anssidNumber"
                label="ANSSID Number"
                required
                hint="Anambra State Social Insurance & Dev. number.">
                <Input
                  id="anssidNumber"
                  name="anssidNumber"
                  type="text"
                  placeholder="ANSSID-XXXXXXXX"
                  required
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Park Location</CardTitle>
            <CardDescription>
              Physical location of the proposed motor park site.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              id="locationAddress"
              label="Full Address"
              required
              hint="Street address, LGA, and town/city.">
              <Input
                id="locationAddress"
                name="locationAddress"
                type="text"
                placeholder="e.g. 12 Zik Avenue, Awka South LGA, Awka"
                required
              />
            </Field>

            <Field
              id="gpsCoordinates"
              label="GPS Coordinates"
              hint="Latitude, Longitude — e.g. 6.2088, 7.0676">
              <Input
                id="gpsCoordinates"
                name="gpsCoordinates"
                type="text"
                placeholder="6.2088, 7.0676"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Section 3: Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Park Manager Contact</CardTitle>
            <CardDescription>
              Primary contact for inspection scheduling and correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field id="contactPerson" label="Manager / Contact Name" required>
              <Input
                id="contactPerson"
                name="contactPerson"
                type="text"
                placeholder="Full name of park manager"
                required
                autoComplete="name"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="contactPhone" label="Phone Number" required>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  placeholder="08012345678"
                  required
                  autoComplete="tel"
                />
              </Field>

              <Field id="contactEmail" label="Email Address" required>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="manager@example.com"
                  required
                  autoComplete="email"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Notice */}
        <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Document uploads</strong> (land
            ownership evidence, CAC certificate) will be available after
            submission. The Parks Inspection Team will contact you to arrange an
            initial site inspection within 5 working days of submission.
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="outline">
            <Link href="/motor-parks">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Submitting…" : "Submit Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
