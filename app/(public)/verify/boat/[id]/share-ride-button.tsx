"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ShareRideButtonProps {
  boatName: string;
  registrationNumber: string;
  securityCode: string;
  riderName: string;
  riderPhone: string;
  verificationUrl: string;
}

export default function ShareRideButton({
  boatName,
  registrationNumber,
  securityCode,
  riderName,
  riderPhone,
  verificationUrl,
}: ShareRideButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `⛵ Safety Alert — Ride Details:\nI am currently aboard '${boatName}' (Reg: ${registrationNumber}, Security Code: ${securityCode}) operated by Captain ${riderName} (${riderPhone}). Verified by Anambra State Ministry of Transport.\n\nVerify Live Status: ${verificationUrl}`;

  async function handleShare() {
    // Web Share API
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Ride Details — ${boatName}`,
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
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
      >
        <Share2 className="w-4 h-4" />
        <span>Share Ride Details for Safety</span>
      </Button>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Button
          variant="outline"
          onClick={shareToWhatsApp}
          className="border-green-600/30 text-green-700 hover:bg-green-50 rounded-xl"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-green-600" />
          Share via WhatsApp
        </Button>
        <Button
          variant="outline"
          onClick={copyToClipboard}
          className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
        >
          {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />}
          {copied ? "Copied!" : "Copy Details"}
        </Button>
      </div>
    </div>
  );
}
