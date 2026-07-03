import {
  ShieldCheck,
  //   Facebook,
  //   Twitter,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/50 text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        {/* Footer Top - Main Content */}
        <div className="grid gap-8 md:grid-cols-4 mb-12">
          {/* Brand & About */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                width={100}
                height={100}
                src="/anambra_mot_logo.png"
                alt=""
                quality={100}
                priority
                className="w-10 h-10"
              />
              <p className="font-display text-sm font-semibold uppercase tracking-[0.12em]">
                Ministry of Transport
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Anambra State digital platform for transport regulation and
              compliance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-[0.12em]">
              Services
            </h3>
            <nav className="space-y-2">
              <a
                href="#modules"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Motor Parks
              </a>
              <a
                href="#modules"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Fleet Registration
              </a>
              <a
                href="#modules"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Vehicle Inspection
              </a>
              <a
                href="#modules"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Accident Reporting
              </a>
              <a
                href="/apply-park-monitor"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Apply For Park Monitoring
              </a>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-[0.12em]">
              About
            </h3>
            <nav className="space-y-2">
              <a
                href="#governance"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                Governance
              </a>
              <a
                href="#workflow"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                How It Works
              </a>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-left">
                Contact Support
              </button>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-left">
                FAQ
              </button>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-[0.12em]">
              Contact
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:support@mot.anambra.gov.ng"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                <span>support@mot.anambra.gov.ng</span>
              </a>
              <a
                href="tel:+234123456789"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                <span>+234 (0) 123 456 789</span>
              </a>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Awka, Anambra State, Nigeria</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Divider */}
        <div className="border-t border-border/60" />

        {/* Footer Bottom - Legal & Social */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-xs text-muted-foreground">
              © 2026 Anambra State Ministry of Transport. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-2 space-x-1">
              <button className="hover:text-foreground transition-colors">
                Privacy Policy
              </button>
              <span>{" • "}</span>
              <button className="hover:text-foreground transition-colors">
                Terms of Service
              </button>
              <span>{" • "}</span>
              <button className="hover:text-foreground transition-colors">
                Accessibility
              </button>
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              aria-label="Twitter"
              className="grid h-8 w-8 place-content-center rounded-md border border-border/60 text-muted-foreground hover:bg-card hover:text-foreground transition-colors">
              {/* <Twitter className="h-4 w-4" /> */}
            </a>
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              className="grid h-8 w-8 place-content-center rounded-md border border-border/60 text-muted-foreground hover:bg-card hover:text-foreground transition-colors">
              {/* <Facebook className="h-4 w-4" /> */}
            </a>
            <a
              href="mailto:info@mot.anambra.gov.ng"
              aria-label="Email"
              className="grid h-8 w-8 place-content-center rounded-md border border-border/60 text-muted-foreground hover:bg-card hover:text-foreground transition-colors">
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-8 pt-8 border-t border-border/60">
          <div className="grid gap-4 sm:grid-cols-3 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Platform Status</p>
              <p className="text-foreground font-semibold mt-1">Operational</p>
            </div>
            <div>
              <p className="text-muted-foreground">Support Hours</p>
              <p className="text-foreground font-semibold mt-1">
                Monday – Friday, 8am – 5pm WAT
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="text-foreground font-semibold mt-1">
                {process.env.NEXT_PUBLIC_LAST_UPDATED || "4 May 2026"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
