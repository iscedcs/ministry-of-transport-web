"use client";

/**
 * Mass Transit Registration — Requirements & Terms Page
 * User must agree before proceeding to the registration form.
 * Content sourced from docs/mass-transit-requirement.md (official Ministry standard)
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const requiredDocuments = [
  "Certificate of Incorporation from the Corporate Affairs Commission (CAC)",
  "Director's Tax Clearance Certificate",
  "Director's Passport Photograph",
  "Company's ASIN (Anambra State Identification Number)",
  "Location and address of Head Office and all branch offices in Anambra State",
  "Business Premises Certificate",
  "ANSAA Registration Certificate / Permit",
  "Documents for proposed terminals/depots (lease or tenancy agreements, payment receipts)",
  "List of vehicles: type, model, registration number, driver name, driver phone, routes, and roadworthiness inspection report",
  "Full staff list with positions, telephone numbers, and locations",
  "Sample picture of proposed fleet colour / branding",
];

const fleetRequirements = [
  "Minimum of five (5) branded vehicles must be in the fleet before application.",
  "All vehicles must have valid/prescribed number plates (red on white background).",
  "Each vehicle must have: vehicle licence, hackney licence/stage carriage permit, certificate of roadworthiness, and certificate of insurance (minimum third party).",
  "All drivers must possess a valid national driver's licence and the Ministry's annual proficiency card.",
  "All vehicles must bear one Ministry-approved brand colour.",
  "Each vehicle will be issued a unique QR code for identification and monitoring.",
  "Any addition to or removal from the fleet must be reported to the Ministry.",
];

const processSteps = [
  "Submit application with all required documents to the Ministry.",
  "Ministry's Parks Inspection and Revalidation Team inspects proposed terminals/depots within 5 working days of endorsement by the Commissioner / Permanent Secretary.",
  "Submitted documents and information are verified by the Ministry.",
  "Applicant pays the one-off application fee into the designated State Government PayDirect account using the company's ASIN.",
  "Fleet vehicles undergo mandatory roadworthiness inspection at a computerised vehicle inspection centre.",
  "Ministry reviews compliance with all requirements.",
  "Qualifying companies are issued a Permit to Operate Certificate, renewable annually.",
  "Monthly payments to the State Government are specified by the Ministry and subject to review.",
];

export default function MassTransitRequirementsPage() {
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
            Mass Transit Registration
          </h1>
          <p className="text-muted-foreground text-base">
            Review the standards for registration of Mass Transit Companies and
            Fleet Operators in Anambra State before creating your account.
          </p>
        </div>

        <div className="space-y-8">
          {/* Eligibility */}
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-5">
            <h2 className="text-base font-semibold text-foreground mb-2">
              Eligibility Requirement
            </h2>
            <p className="text-sm text-foreground/90">
              Your company must have a{" "}
              <span className="font-semibold">
                minimum of five (5) branded vehicles
              </span>{" "}
              in its fleet to be considered as a Mass Transit Company or Fleet
              Operator.
            </p>
          </section>

          {/* Required Documents */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              Required Documents &amp; Information
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

          {/* Fleet Requirements */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                2
              </span>
              Fleet &amp; Vehicle Requirements
            </h2>
            <ul className="space-y-2.5">
              {fleetRequirements.map((req, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </section>

          {/* Process */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                3
              </span>
              Registration Process
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

          {/* Payment Notice */}
          <section className="rounded-lg border border-border/60 bg-muted/30 p-5">
            <h2 className="text-base font-semibold text-foreground mb-2">
              Payment Notice
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {` A one-off application fee is payable into the designated State Government
              PayDirect account, referenced by your company's ASIN. Companies that meet
              all requirements are issued a Permit to Operate Certificate, subject to
              annual renewal. Monthly payments to the State Government apply as specified
              by the Ministry.`}
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
              I have read and understand all the requirements, fleet standards,
              and terms above. I confirm that my company meets the minimum
              eligibility criteria (5 branded vehicles) to apply for Mass
              Transit registration in Anambra State.
            </Label>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push("/register?service=MASS_TRANSIT")}
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
