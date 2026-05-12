"use client";

/**
 * Staff Login Page — Ministry of Transport Platform
 * STORY-007: Login flows
 *
 * Password-based login for Ministry staff only.
 * External applicants use /login (email + ASIN, passwordless).
 */

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
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

export default function StaffLoginPage() {
  const [state, action, isPending] = useActionState<AuthFormState, FormData>(
    login,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}>
          Staff Sign In
        </CardTitle>
        <CardDescription>
          Ministry staff: enter your email and password.
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
            <div className="flex justify-between items-baseline">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                aria-invalid={!!state?.errors?.password}
                aria-describedby={
                  state?.errors?.password ? "password-error" : undefined
                }
                className={`pr-10 ${state?.errors?.password ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {state?.errors?.password && (
              <p id="password-error" className="text-xs text-destructive" role="alert">
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

      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground text-center w-full">
          Applicant?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in here
          </Link>
          {" · "}
          Staff accounts are provisioned by the Permanent Secretary.
        </p>
      </CardFooter>
    </Card>
  );
}
