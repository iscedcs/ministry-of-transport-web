"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Share, PlusSquare, X, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already running as an installed PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if user dismissed the banner previously (in the last 7 days)
    const dismissedTime = localStorage.getItem("mot-pwa-banner-dismissed");
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS prompt after a slight delay for better user experience
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Handle standard beforeinstallprompt (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(!showIOSInstructions);
      return;
    }

    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("mot-pwa-banner-dismissed", Date.now().toString());
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="relative bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-2xl overflow-hidden text-card-foreground">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none -z-10" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-400 to-transparent" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/60"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="relative w-12 h-12 rounded-xl bg-background border border-border/80 p-1.5 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Image
              src="/anambra_mot_logo.png"
              alt="Anambra MOT"
              width={40}
              height={40}
              className="w-9 h-9 object-contain"
            />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-foreground leading-tight">
                Install Anambra MOT App
              </h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
                Official PWA
              </span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              Install the official platform for fast motor park verifications, compliance checks, and offline access.
            </p>
          </div>
        </div>

        {/* iOS Specific Instructions Accordion */}
        {showIOSInstructions && (
          <div className="mt-4 p-3 bg-muted/60 rounded-xl border border-border/60 text-xs space-y-2 animate-in fade-in duration-300">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>How to Install on iPhone / iPad:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground pl-1">
              <li>
                Tap the <span className="font-semibold text-foreground inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border"><Share className="w-3 h-3 text-blue-500" /> Share button</span> in your Safari browser bar.
              </li>
              <li>
                Scroll down and select <span className="font-semibold text-foreground inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border"><PlusSquare className="w-3 h-3 text-foreground" /> Add to Home Screen</span>.
              </li>
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
          <Button
            onClick={handleInstallClick}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? (showIOSInstructions ? "Hide Instructions" : "Install on iOS") : "Install App Now"}</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="h-10 px-4 rounded-xl text-xs border-border hover:bg-muted font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
}
