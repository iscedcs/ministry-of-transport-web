"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ShareRideButtonProps {
  makeModel?: string;
  registrationNumber: string;
  fleetNumber: string;
  driverName: string;
  driverPhone: string;
  driverSecurityCode?: string;
  assignedRoute?: string;
  verificationUrl: string;
}

export default function ShareRideButton({
  makeModel,
  registrationNumber,
  fleetNumber,
  driverName,
  driverPhone,
  driverSecurityCode,
  assignedRoute,
  verificationUrl,
}: ShareRideButtonProps) {
  const [copied, setCopied] = useState(false);

  const vehicleInfo = makeModel
    ? `${makeModel} (${registrationNumber})`
    : registrationNumber;
  const secCodeText =
    driverSecurityCode && driverSecurityCode !== "N/A"
      ? `, Sec Code: ${driverSecurityCode}`
      : "";
  const routeText = assignedRoute ? ` on route '${assignedRoute}'` : "";

  const shareText = `🚖 Safety Alert — TRACAS Ride Details:\nI am currently traveling in ${vehicleInfo} (Fleet No: ${fleetNumber}) operated by Driver ${driverName} (${driverPhone}${secCodeText})${routeText}. Verified by Anambra State Ministry of Transport (TRACAS).\n\nVerify Live Status: ${verificationUrl}`;

  async function handleShare() {
    // Web Share API
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `TRACAS Ride Details — ${registrationNumber}`,
          text: shareText,
          url: verificationUrl,
        });
        toast.success("Ride details shared!");
        return;
      } catch (err) {
        // Fallback to clipboard if share cancelled or unavailable
      }
    }

    // Fallback: Copy to clipboard
    copyToClipboard();
  }

  function copyToClipboard() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Ride safety details copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function shareToWhatsApp() {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  }

  return (
    <div className="w-full space-y-2 mt-6">
      <Button
        onClick={handleShare}
        className="w-full bg-[var(--brand-gold)] text-[var(--text-inverse)] hover:bg-[var(--brand-gold-up)] text-slate-950 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all">
        <Share2 className="w-4 h-4" />
        <span>Share Ride Details for Safety</span>
      </Button>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Button
          variant="outline"
          onClick={shareToWhatsApp}
          className="border-border text-foreground hover:bg-secondary rounded-xl py-2.5">
          <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
          Share via WhatsApp
        </Button>
        <Button
          variant="outline"
          onClick={copyToClipboard}
          className="border-border text-foreground hover:bg-secondary rounded-xl py-2.5">
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          )}
          {copied ? "Copied!" : "Copy Details"}
        </Button>
      </div>
    </div>
  );
}
