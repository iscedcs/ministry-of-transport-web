"use client";

/**
 * Login Page — Ministry of Transport Platform
 * STORY-007: Login flows
 */

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
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

export default function LoginPage() {
  const [state, action, isPending] = useActionState<AuthFormState, FormData>(
    login,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}>
          Sign in
        </CardTitle>
        <CardDescription>
          Use your email and password to access the platform.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {state?.message && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={action} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!state?.errors?.email}
              aria-describedby={
                state?.errors?.email ? "email-error" : undefined
              }
              className={state?.errors?.email ? "border-destructive" : ""}
            />
            {state?.errors?.email && (
              <p
                id="email-error"
                className="text-xs text-destructive"
                role="alert">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!state?.errors?.password}
              aria-describedby={
                state?.errors?.password ? "password-error" : undefined
              }
              className={state?.errors?.password ? "border-destructive" : ""}
            />
            {state?.errors?.password && (
              <p
                id="password-error"
                className="text-xs text-destructive"
                role="alert">
                {state.errors.password[0]}
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
          <Link href="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center border-t border-border/50 pt-4 w-full">
          Ministry staff accounts are provisioned by the Permanent Secretary.
        </p>
      </CardFooter>
    </Card>
  );
}
