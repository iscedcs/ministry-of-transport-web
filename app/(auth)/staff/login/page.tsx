"use client";

/**
 * Staff Login Page — Ministry of Transport Platform
 * STORY-007: Login flows
 *
 * Password-based login for Ministry staff only.
 * External applicants use /login (email + ASIN, passwordless).
 */

import { useActionState, useState, useRef } from "react";
import Link from "next/link";
import { Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react";
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

const TEST_STAFF_CREDENTIALS = [
  {
    role: "System Admin",
    email: "admin@mot.anambra.gov.ng",
    name: "Chidi Okonkwo",
  },
  {
    role: "Commissioner",
    email: "commissioner@mot.anambra.gov.ng",
    name: "Dr. Christian Nwabueze",
  },
  {
    role: "Permanent Secretary",
    email: "ps@mot.anambra.gov.ng",
    name: "Engr. Chinelo Eze",
  },
  {
    role: "HOD Motor Parks",
    email: "hod.parks@mot.anambra.gov.ng",
    name: "Obinna Anayo",
  },
  {
    role: "HOD VIS",
    email: "hod.vis@mot.anambra.gov.ng",
    name: "Kenechukwu Okafor",
  },
  {
    role: "Field Inspector",
    email: "inspector@mot.anambra.gov.ng",
    name: "Emeka Nduka",
  },
];

const PASSWORD = "Password123";

function TestCredentialsSection({
  onSelectCredential,
}: {
  onSelectCredential: (email: string) => void;
}) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleClickCredential = (email: string) => {
    onSelectCredential(email);
  };

  return (
    <div className="mt-6 pt-6 border-t border-border/50">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        🧪 Test Credentials (Demo Mode)
      </p>
      <div className="space-y-2">
        {TEST_STAFF_CREDENTIALS.map((cred) => (
          <button
            key={cred.email}
            type="button"
            onClick={() => handleClickCredential(cred.email)}
            className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors group">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {cred.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{cred.role}</p>
                <p className="text-xs text-muted-foreground/70 truncate mt-1">
                  {cred.email}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(cred.email);
                }}
                className="ml-2 p-1.5 rounded hover:bg-primary/10 transition-colors shrink-0"
                title="Copy email">
                {copiedEmail === cred.email ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/30 rounded">
        <strong>Password for all:</strong> <code className="font-mono">{PASSWORD}</code>
      </p>
    </div>
  );
}

export default function StaffLoginPage() {
  const [state, action, isPending] = useActionState<AuthFormState, FormData>(
    login,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSelectCredential = (email: string) => {
    if (emailInputRef.current) {
      emailInputRef.current.value = email;
      emailInputRef.current.focus();
    }
    if (passwordInputRef.current) {
      passwordInputRef.current.value = PASSWORD;
    }
  };

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
              ref={emailInputRef}
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
                ref={passwordInputRef}
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

        <TestCredentialsSection onSelectCredential={handleSelectCredential} />
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
