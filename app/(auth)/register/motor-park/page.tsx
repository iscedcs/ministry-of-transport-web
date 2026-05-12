"use client";

/**
 * Motor Park Registration — Requirements & Terms Page
 * User must agree before proceeding to the registration form.
 * Content sourced from docs/parks-standard.md (official Ministry standard)
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const requiredDocuments = [
  "Application letter from the intending private Park Owner",
  "Business / Transport Company Name",
  "Location of the motor park",
  "Evidence of CAC (Corporate Affairs Commission) Registration",
  "Company ANSSID Number",
  "Land ownership or lease agreement documents",
  "Name and telephone contact of the park manager",
];

const siteStandards = [
  "Adequate parking arrangement and order for vehicles waiting to load",
  "Distinct entrance and exit with dwarf gate and gatehouse for checks",
  "Paved, marked land with perimeter fence (minimum wire mesh or dwarf wall with iron fence rail)",
  "Separate male and female conveniences (urinary and toilets), kept clean and disinfected",
  "Borehole or dedicated water tank for the park",
  "Refreshment shop or restaurant (no alcoholic drinks; no hawkers)",
  "Ticketing office, waiting lounge with seats, and Manager's office",
  "Minimum of two (2) × 9kg DCP fire extinguishers",
];

const processSteps = [
  "Submit application letter with all required documents to the Ministry.",
  "Ministry team inspects the proposed site.",
  "Commissioner / Permanent Secretary issues a 'Permit to Build' stipulating standards.",
  "Applicant constructs the park to the prescribed standards.",
  "Ministry conducts re-inspection after construction is complete.",
  "Re-inspection evaluates proximity to public parks, major roads, and intersections.",
  "Park is evaluated for Motor Park Fee / Levy.",
  "Ministry issues final approval letter with terms, conditions, and annual revalidation requirement.",
];

export default function MotorParkRequirementsPage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
            Anambra State Ministry of Transport
          </p>
          <h1
            className="text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
            Motor Park Registration
          </h1>
          <p className="text-muted-foreground text-base">
            Review the requirements and standards for approving a private motor
            park in Anambra State before creating your account.
          </p>
        </div>

        <div className="space-y-8">
          {/* Required Documents */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              Required Documents
            </h2>
            <ul className="space-y-2.5">
              {requiredDocuments.map((doc, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </section>

          {/* Site Standards */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                2
              </span>
              Site Standards for Approval
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              The proposed park must meet all of the following physical
              standards:
            </p>
            <ul className="space-y-2.5">
              {siteStandards.map((std, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  {std}
                </li>
              ))}
            </ul>
          </section>

          {/* Approval Process */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                3
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

          {/* Terms & Conditions */}
          <section className="rounded-lg border border-border/60 bg-muted/30 p-5">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Terms &amp; Conditions
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Ministry reserves the right to revoke or withdraw its approval
              if the terms and conditions governing the park operations are not
              complied with, or if the applicant wilfully misinformed or misled
              the Ministry during the process of application and approval.
              Approved parks are subject to annual revalidation and fee
              reassessment.
            </p>
          </section>

          {/* Agreement checkbox */}
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
              I have read and understand all the requirements, standards, and
              terms above. I confirm that I meet the eligibility criteria to
              apply for a Motor Park registration in Anambra State.
            </Label>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push("/register?service=MOTOR_PARK")}
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
