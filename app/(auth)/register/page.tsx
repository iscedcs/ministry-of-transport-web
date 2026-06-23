"use client";

/**
 * External Applicant Registration — Ministry of Transport Platform
 * STORY-007: User registration flows
 *
 * Passwordless registration — applicants authenticate with email + ASIN.
 * Requires a valid `service` query param (MOTOR_PARK | MASS_TRANSIT).
 * If missing, redirects back to home to select a service first.
 */

import { useActionState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { registerApplicant } from "@/app/actions/auth";
import type { AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SERVICE_LABELS: Record<string, string> = {
  MOTOR_PARK: "Motor Park Registration",
  MASS_TRANSIT: "Mass Transit Registration",
  REVALIDATION: "Revalidation Services",
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {errors[0]}
    </p>
  );
}

function RegisterForm() {
  const [state, action, isPending] = useActionState<AuthFormState, FormData>(
    registerApplicant,
    undefined,
  );
  const e = state?.errors;
  const searchParams = useSearchParams();
  const router = useRouter();

  const service = searchParams.get("service");
  const serviceLabel = service ? SERVICE_LABELS[service] : null;

  // Guard: must arrive from a service requirements page
  useEffect(() => {
    if (!service || !SERVICE_LABELS[service]) {
      router.replace("/");
    }
  }, [service, router]);

  if (!service || !serviceLabel) return null;

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          {serviceLabel}
        </p>
        <CardTitle
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}>
          Create your account
        </CardTitle>
        <CardDescription>
          You will sign in using your email address and ASIN number — no
          password required.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {state?.message && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={action} noValidate className="flex flex-col gap-4">
          {/* Hidden service field */}
          <input type="hidden" name="service" value={service} />

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={state?.fields?.firstName}
                type="text"
                autoComplete="given-name"
                required
                aria-invalid={!!e?.firstName}
                aria-describedby={e?.firstName ? "firstName-error" : undefined}
                className={e?.firstName ? "border-destructive" : ""}
              />
              <FieldError id="firstName-error" errors={e?.firstName} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={state?.fields?.lastName}
                autoComplete="family-name"
                required
                aria-invalid={!!e?.lastName}
                aria-describedby={e?.lastName ? "lastName-error" : undefined}
                className={e?.lastName ? "border-destructive" : ""}
              />
              <FieldError id="lastName-error" errors={e?.lastName} />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={state?.fields?.email}
              autoComplete="email"
              required
              aria-invalid={!!e?.email}
              aria-describedby={e?.email ? "email-error" : undefined}
              className={e?.email ? "border-destructive" : ""}
            />
            <FieldError id="email-error" errors={e?.email} />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={state?.fields?.phone}
              placeholder="08012345678"
              required
              aria-invalid={!!e?.phone}
              aria-describedby={e?.phone ? "phone-error" : undefined}
              className={e?.phone ? "border-destructive" : ""}
            />
            <FieldError id="phone-error" errors={e?.phone} />
          </div>

          {/* Residential Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="residentialAddress">Residential / Home Address</Label>
            <Textarea
              id="residentialAddress"
              name="residentialAddress"
              defaultValue={state?.fields?.residentialAddress}
              placeholder="House/flat number, street, area, LGA, city"
              required
              rows={3}
              aria-invalid={!!e?.residentialAddress}
              aria-describedby={e?.residentialAddress ? "address-error" : undefined}
              className={e?.residentialAddress ? "border-destructive" : ""}
            />
            <FieldError id="address-error" errors={e?.residentialAddress} />
          </div>

          {/* ASIN */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asinNumber">
              Your Personal ASIN Number{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (Anambra State ID — 6 to 16 digits)
              </span>
            </Label>
            <Input
              id="asinNumber"
              name="asinNumber"
              type="text"
              inputMode="numeric"
              defaultValue={state?.fields?.asinNumber}
              maxLength={16}
              placeholder="Your Anambra State ID Number"
              required
              aria-invalid={!!e?.asinNumber}
              aria-describedby={e?.asinNumber ? "asin-error" : undefined}
              className={e?.asinNumber ? "border-destructive" : ""}
            />
            <FieldError id="asin-error" errors={e?.asinNumber} />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isPending}
            aria-busy={isPending}>
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="pt-0">
        <p className="text-sm text-muted-foreground text-center w-full">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
