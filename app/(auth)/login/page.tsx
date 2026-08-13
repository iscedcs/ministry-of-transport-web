"use client";

/**
 * Applicant Login Page — Ministry of Transport Platform
 * STORY-007: Login flows
 *
 * Passwordless login for External Applicants: email + ASIN number.
 * Ministry staff use /staff/login (email + password).
 */

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginApplicant } from "@/app/actions/auth";
import type { AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

function RegistrationBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("registered") !== "1") return null;
  return (
    <Alert className="mb-5 border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">
      <AlertDescription>
        Account created successfully. Sign in to continue your application.
      </AlertDescription>
    </Alert>
  );
}

function LoginForm() {
  const [state, action, isPending] = useActionState<AuthFormState, FormData>(
    loginApplicant,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}>
          Applicant Sign In
        </CardTitle>
        <CardDescription>
          Enter your email and ASIN number to access your application.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Suspense>
          <RegistrationBanner />
        </Suspense>

        {state?.message && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={action} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address or phone number</Label>
            <Input
              id="email"
              name="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="you@example.com or 08012345678"
              required
              aria-invalid={!!state?.errors?.email}
              aria-describedby={state?.errors?.email ? "email-error" : undefined}
              className={state?.errors?.email ? "border-destructive" : ""}
            />
            {state?.errors?.email && (
              <p id="email-error" className="text-xs text-destructive" role="alert">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asinNumber">Your Personal Registered ASIN Number</Label>
            <Input
              id="asinNumber"
              name="asinNumber"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Your Anambra State ID Number"
              required
              aria-invalid={!!state?.errors?.asinNumber}
              aria-describedby={state?.errors?.asinNumber ? "asin-error" : undefined}
              className={state?.errors?.asinNumber ? "border-destructive" : ""}
            />
            {state?.errors?.asinNumber && (
              <p id="asin-error" className="text-xs text-destructive" role="alert">
                {state.errors.asinNumber[0]}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isPending}
            aria-busy={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-0">
        <p className="text-sm text-muted-foreground text-center">
          New applicant?{" "}
          <Link href="/" className="text-primary hover:underline">
            Select a service to register
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center border-t border-border/50 pt-4 w-full">
          Ministry staff?{" "}
          <Link href="/staff/login" className="text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
