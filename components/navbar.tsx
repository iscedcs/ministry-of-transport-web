"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
          <Image
            width={100}
            height={100}
            src="/anambra_mot_logo.png"
            alt="Anambra MOT"
            quality={100}
            priority
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
          />
          <div>
            <p className="font-bold text-xs sm:text-sm text-foreground leading-tight">
              Anambra State Government
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">
              Ministry of Transport
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
          <Link
            href="/services"
            className="transition-colors hover:text-foreground/80 font-medium"
          >
            Services
          </Link>
          <Link
            href="/verify/motor-parks"
            className="transition-colors text-primary font-semibold hover:text-primary/80 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Park</span>
          </Link>
          <Link
            href="/#workflow"
            className="transition-colors hover:text-foreground/80 font-medium"
          >
            How It Works
          </Link>
          <Link
            href="/#governance"
            className="transition-colors hover:text-foreground/80 font-medium"
          >
            About
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild size="sm" className="rounded-xl px-5 font-semibold">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        {/* Mobile Hamburger Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 rounded-lg border-primary/40 text-primary">
            <Link href="/login">Sign In</Link>
          </Button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-b border-border/60 bg-card/95 backdrop-blur-xl px-6 py-5 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <nav className="flex flex-col gap-4 text-sm font-medium">
            <Link
              href="/services"
              onClick={() => setIsOpen(false)}
              className="py-2 text-foreground hover:text-primary transition-colors flex items-center justify-between border-b border-border/40"
            >
              <span>Services</span>
            </Link>
            <Link
              href="/verify/motor-parks"
              onClick={() => setIsOpen(false)}
              className="py-2.5 px-3 bg-primary/10 text-primary rounded-xl font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Motor Park</span>
              </div>
              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Public Portal</span>
            </Link>
            <Link
              href="/#workflow"
              onClick={() => setIsOpen(false)}
              className="py-2 text-foreground hover:text-primary transition-colors flex items-center justify-between border-b border-border/40"
            >
              <span>How It Works</span>
            </Link>
            <Link
              href="/#governance"
              onClick={() => setIsOpen(false)}
              className="py-2 text-foreground hover:text-primary transition-colors flex items-center justify-between border-b border-border/40"
            >
              <span>About Ministry</span>
            </Link>
            <div className="pt-2 flex flex-col gap-2">
              <Button asChild className="w-full rounded-xl font-semibold justify-center">
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  Sign In to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl font-medium justify-center text-xs">
                <Link href="/staff/login" onClick={() => setIsOpen(false)}>
                  Staff / Ministry Access
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
