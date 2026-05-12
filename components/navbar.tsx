import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            width={100}
            height={100}
            src="/anambra_mot_logo.png"
            alt=""
            quality={100}
            priority
            className="w-10 h-10"
          />
          <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            Ministry of Transport
          </p>
        </div>

        <nav className="hidden items-center gap-10 text-sm text-muted-foreground md:flex">
          <a
            href="#modules"
            className="transition-colors hover:text-foreground">
            Services
          </a>
          <a
            href="#workflow"
            className="transition-colors hover:text-foreground">
            How It Works
          </a>
          <a
            href="#governance"
            className="transition-colors hover:text-foreground">
            About
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {/* <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex">
            <Link href="/register">Sign Up</Link>
          </Button> */}
          <Button asChild size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
