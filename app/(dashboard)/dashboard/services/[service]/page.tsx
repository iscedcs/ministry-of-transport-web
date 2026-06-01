import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddServiceForm } from "./add-service-form";
import { SERVICE_LABELS } from "@/lib/service-config";

const serviceSlugToKey: Record<string, keyof typeof SERVICE_LABELS> = {
  "motor-park": "MOTOR_PARK",
  "mass-transit": "MASS_TRANSIT",
};

const serviceRequirements: Record<
  keyof typeof SERVICE_LABELS,
  {
    requiredDocuments: string[];
    siteStandards: string[];
    processSteps: string[];
    terms: string;
  }
> = {
  MOTOR_PARK: {
    requiredDocuments: [
      "Create account as owner and proceed with the form new application",
      "Business / Transport Company Name",
      "Location of the motor park",
      "Evidence of CAC (Corporate Affairs Commission) Registration",
      "Company ANSSID Number",
      "Land ownership or lease agreement documents",
      "Name and telephone contact of the park manager",
    ],
    siteStandards: [
      "Adequate parking arrangement and order for vehicles waiting to load",
      "Distinct entrance and exit with dwarf gate and gatehouse for checks",
      "Paved, marked land with perimeter fence (minimum wire mesh or dwarf wall with iron fence rail)",
      "Separate male and female conveniences (urinary and toilets), kept clean and disinfected",
      "Borehole or dedicated water tank for the park",
      "Refreshment shop or restaurant (no alcoholic drinks; no hawkers)",
      "Ticketing office, waiting lounge with seats, and Manager's office",
      "Minimum of two (2) × 9kg DCP fire extinguishers",
    ],
    processSteps: [
      "Submit application letter with all required documents to the Ministry.",
      "Ministry team inspects the proposed site.",
      "Commissioner / Permanent Secretary issues a 'Permit to Build' stipulating standards.",
      "Applicant constructs the park to the prescribed standards.",
      "Ministry conducts re-inspection after construction is complete.",
      "Re-inspection evaluates proximity to public parks, major roads, and intersections.",
      "Park is evaluated for Motor Park Fee / Levy.",
      "Ministry issues final approval letter with terms, conditions, and annual revalidation requirement.",
    ],
    terms:
      "The Ministry reserves the right to revoke or withdraw its approval if the terms and conditions governing the park operations are not complied with, or if the applicant wilfully misinformed or misled the Ministry during the process of application and approval. Approved parks are subject to annual revalidation and fee reassessment.",
  },
  MASS_TRANSIT: {
    requiredDocuments: [
      "Proof of company registration and licensing documents",
      "Vehicle fleet declaration and ownership documents",
      "Depots or terminals lease / ownership agreements",
      "Proof of insurance coverage for vehicles and passengers",
      "Driver qualification and licensing records",
      "Operational safety and maintenance plan",
      "Payment of any initial registration fees",
    ],
    siteStandards: [
      "Service terminals must have passenger waiting areas",
      "Vehicles must be in safe operational condition",
      "Drivers must be licensed and insured",
      "Roadworthy inspection certificates must be current",
      "Company branding must comply with Ministry standards",
      "Operational routes should be clearly documented",
      "Safety equipment must be available on each vehicle",
    ],
    processSteps: [
      "Submit registration documents and company details.",
      "Ministry verifies fleet, terminals and driver qualifications.",
      "Vehicles undergo inspection for roadworthiness.",
      "Branding and service routes are approved.",
      "Fees are calculated and paid online.",
      "Permit to operate is issued on successful verification.",
      "Annual renewal and compliance checks are scheduled.",
    ],
    terms:
      "The Ministry will revoke registration if safety standards are breached or if operational terms are not met. All mass transit operators are subject to ongoing inspection and annual renewal requirements.",
  },
};

export default async function AddServiceRequirementsPage({
  params,
}: {
  params: Promise<{ service: string }>;
}) {
  const { service } = await params;
  const serviceKey = serviceSlugToKey[service];
  const serviceLabel = serviceKey ? SERVICE_LABELS[serviceKey] : null;
  const requirements = serviceKey ? serviceRequirements[serviceKey] : null;

  if (!serviceKey || !requirements) {
    redirect("/dashboard/services");
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Service Picker
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
            Add Service to Your Account
          </p>
          <h1
            className="text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
            {serviceLabel} Requirements
          </h1>
          <p className="text-muted-foreground text-base">
            Review the requirements and confirm your eligibility before adding
            this service to your account.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              Required Documents
            </h2>
            <ul className="space-y-2.5">
              {requirements.requiredDocuments.map((doc, index) => (
                <li
                  key={index}
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
              Approval Process
            </h2>
            <ol className="space-y-3">
              {requirements.processSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="w-5 h-5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
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
              {requirements.terms}
            </p>
          </section>

          <AddServiceForm serviceKey={serviceKey} />
        </div>
      </div>
    </div>
  );
}
