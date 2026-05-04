"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Bus,
  Car,
  ClipboardList,
  FileCheck2,
  Landmark,
  School,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const launchModules = [
  {
    title: "Motor Park Management",
    description:
      "Digital application, inspection scheduling, permit-to-build, revalidation, and compliance enforcement.",
    icon: Building2,
  },
  {
    title: "Mass Transit Registration",
    description:
      "Company onboarding, fleet declarations, branding approval, and annual permit renewal workflows.",
    icon: Bus,
  },
  {
    title: "Revenue and Payments",
    description:
      "ASIN-linked fee tracking, digital receipts, arrears visibility, and disaggregated revenue reporting.",
    icon: Wallet,
  },
  {
    title: "Ministry Administration",
    description:
      "Role-based operations for Commissioner, Permanent Secretary, HODs, field teams, and finance staff.",
    icon: Landmark,
  },
  {
    title: "VIS Inspection",
    description:
      "Private and commercial vehicle inspection intake with insurance and roadworthiness checkpoints.",
    icon: Car,
  },
  {
    title: "Accident Reporting (AVIR)",
    description:
      "End-to-end digital AVIR workflow with MOT and Police routing, sign-off, and archive copies.",
    icon: ClipboardList,
  },
  {
    title: "Driving School Registration",
    description:
      "Application, VIO test submission, certificate decisioning, and rejection reason transparency.",
    icon: School,
  },
  {
    title: "Certificate Workflow Engine",
    description:
      "Reusable application-to-certificate flow with temporary/permanent issuance and policy controls.",
    icon: FileCheck2,
  },
];

const workflow = [
  {
    step: "01",
    title: "Apply Online",
    note: "Submit your application and documents securely. Use your ASIN number to create your account.",
  },
  {
    step: "02",
    title: "Inspection",
    note: "Ministry staff review your documents and schedule a site visit if needed.",
  },
  {
    step: "03",
    title: "Payment",
    note: "Pay all required fees online. You&apos;ll get a receipt and confirmation immediately.",
  },
  {
    step: "04",
    title: "Certificate",
    note: "Once approved, your permit or certificate is ready to download. Renew annually as required.",
  },
];

export default function Home() {
  return (
    <div className="relative bg-background text-foreground">
      {/* HERO SECTION */}
      <section className="relative min-h-150 overflow-hidden md:min-h-175 flex items-center justify-center">
        {/* Background Image Carousel */}
        <div className="absolute inset-0">
          {/* Image 1 - Road */}
          <Image
            src="/road.png"
            alt="Transport infrastructure"
            fill
            className="object-cover animate-hero-fade-1"
            priority
          />
        </div>

        <div className="absolute inset-0">
          {/* Image 2 - WebP */}
          <Image
            src="/603969393.webp"
            alt="Motor park operations"
            fill
            className="object-cover animate-hero-fade-2"
            priority
          />
        </div>

        <div className="absolute inset-0">
          {/* Image 3 - Motor Park */}
          <Image
            src="/motor-park.jpg"
            alt="Modern motor park"
            fill
            className="object-cover animate-hero-fade-3"
            priority
          />
        </div>

        <div className="absolute inset-0">
          {/* Image 4 - Street Scene */}
          <Image
            src="/9941885_fbimg1564595445216_jpeg7cd4e53196fdcbfae88dafdd787812c2.jpg"
            alt="Transport hub"
            fill
            className="object-cover animate-hero-fade-4"
            priority
          />
        </div>

        {/* Dark Overlay - Main */}
        <div className="absolute inset-0 bg-linear-to-b from-[rgb(0,0,0,0.5)] via-[rgb(0,0,0,0.6)] to-[rgb(0,0,0,0.65)]" />

        {/* Overlay - Radial gradient for focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.7)_100%)]" />

        {/* Content Overlay */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 text-center md:py-32">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/95 drop-shadow-lg">
              Anambra State Ministry of Transport
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight tracking-[-0.02em] text-white drop-shadow-2xl">
              Automating Anambra&apos;s Transport Future
            </h1>

            <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-white drop-shadow-xl">
              A single, modern platform for all transport operations: motor park
              approvals, fleet registration, vehicle inspection, and compliance
              management.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xl">
                <Link href="/register">Create Account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/60 text-white hover:bg-white/20 shadow-xl">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* CSS animations for image carousel */}
        <style jsx>{`
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            25% {
              opacity: 1;
            }
            35% {
              opacity: 0;
            }
            100% {
              opacity: 0;
            }
          }

          :global(.animate-hero-fade-1) {
            animation: fadeIn 12s infinite;
          }

          :global(.animate-hero-fade-2) {
            animation: fadeIn 12s infinite 3s;
          }

          :global(.animate-hero-fade-3) {
            animation: fadeIn 12s infinite 6s;
          }

          :global(.animate-hero-fade-4) {
            animation: fadeIn 12s infinite 9s;
          }
        `}</style>
      </section>

      {/* MODULES SECTION */}
      <section id="modules" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary mb-3">
            Eight Core Services
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground">
            Everything in one place
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Each service maps directly to Anambra Ministry of Transport
            standards. Submit applications, track inspections, pay fees, and
            manage your permits online.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 mb-12 sm:grid-cols-3">
          <div className="border border-border/60 rounded-lg p-6 bg-card/50">
            <p className="text-3xl font-bold text-foreground">8</p>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-2">
              Core Services
            </p>
          </div>
          <div className="border border-border/60 rounded-lg p-6 bg-card/50">
            <p className="text-3xl font-bold text-foreground">100%</p>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-2">
              Digital Payments
            </p>
          </div>
          <div className="border border-border/60 rounded-lg p-6 bg-card/50">
            <p className="text-3xl font-bold text-foreground">99.5%</p>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-2">
              Uptime Guarantee
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {launchModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className="border-border/70 bg-card/60 hover:bg-card/80 transition-colors">
                <CardHeader className="space-y-3 pb-3">
                  <div className="grid h-9 w-9 place-content-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {module.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="workflow"
        className="border-y border-border/60 bg-card/50 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary mb-3">
              Simple Process
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground">
              How it works
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              From application to approval, the process is transparent and
              straightforward. Track your status every step of the way.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {workflow.map((item, idx) => (
              <div key={item.step} className="relative">
                <Card className="border-border/70 bg-background h-full">
                  <CardHeader>
                    <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                      Step {item.step}
                    </p>
                    <CardTitle className="text-lg mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.note}
                    </p>
                  </CardContent>
                </Card>
                {idx < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-border/60 transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GOVERNANCE & INFO */}
      <section id="governance" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Zero Cost to Government
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                This platform is built and operated as a public-private
                partnership. The Ministry pays nothing upfront. All development
                and hosting costs are covered by the implementing partner.
              </p>
              <p>
                The Ministry retains full control over all policy decisions,
                approval workflows, and regulatory standards. Every action on
                the platform is logged and auditable.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                What You Need to Know
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">For Applicants:</strong>{" "}
                You&apos;ll need your Anambra State Identification Number (ASIN)
                to create an account and submit applications online.
              </p>
              <p>
                <strong className="text-foreground">For Ministry Staff:</strong>{" "}
                Use your staff account to manage applications, schedule
                inspections, issue permits, and view compliance dashboards.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border/60 bg-linear-to-br from-[oklch(20%_0.06_15/0.2)] to-background px-6 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 text-center">
          <div className="space-y-4 max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground">
              Ready to get started?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Create your account to apply for permits, register fleets, or
              access Ministry dashboards. If you&apos;re a Ministry staff
              member, sign in with your credentials.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Create Account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
