"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const requiredItems = [
  "Create account as owner and proceed to the revalidation form",
  "Business / Transport Company Name",
  "Anambra State Identification Number (ASIN)",
  "Location and operational status of the motor park or facility",
  "Staffing and Security Information",
  "Recent Passport Photograph of Owner/Representative",
];

const processSteps = [
  "Submit revalidation form online.",
  "Ministry team conducts a revalidation inspection.",
  "Review of operational status, facilities, and compliance.",
  "HOD Revalidation confirms compliance with safety and operational standards.",
  "Revalidation Approval Number is generated.",
];

export default function RevalidationRequirementsPage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
            Anambra State Ministry of Transport
          </p>
          <h1
            className="text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
            Revalidation Services
          </h1>
          <p className="text-muted-foreground text-base">
            Review the requirements for revalidating a motor park, terminal, loading bay, or transport facility in Anambra State.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              Required Information
            </h2>
            <ul className="space-y-2.5">
              {requiredItems.map((doc, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                2
              </span>
              Application & Approval Process
            </h2>
            <ol className="space-y-3">
              {processSteps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="w-5 h-5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-border/60 bg-muted/30 p-5">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Terms &amp; Conditions
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Approved parks are subject to periodic revalidation and compliance checks.
              The Ministry reserves the right to revoke or withdraw its approval if the terms and conditions are not met.
            </p>
          </section>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4 bg-background">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5"
            />
            <Label
              htmlFor="agree"
              className="text-sm leading-relaxed cursor-pointer">
              I have read and understand all the requirements. I confirm that I want to apply for Revalidation.
            </Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push("/register?service=REVALIDATION")}
              disabled={!agreed}
              className="flex-1 sm:flex-none sm:min-w-[200px]">
              Continue to Register →
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
