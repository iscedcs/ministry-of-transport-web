"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { updateParkMonitorPhoto } from "@/app/actions/park-monitor";
import { initiateParkMonitorIdPayment } from "@/app/actions/payments";
import { PassportPhotoInput } from "@/components/park-monitor/passport-photo-input";

export function ClaimIdForm({ currentPhotoUrl }: { currentPhotoUrl?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  // The component has already compressed and uploaded the photo by the time
  // this runs; saving it against the application is the only step left.
  const handlePhotoChange = async (url: string | null) => {
    setPhotoUrl(url);
    setError(null);
    if (!url) return;

    const saved = await updateParkMonitorPhoto(url);
    if (!saved.success) setError(saved.error ?? "Failed to save photo");
  };

  const handlePayment = () => {
    if (!photoUrl) {
      setError("Please add a passport photo first.");
      return;
    }

    startTransition(async () => {
      // initiateParkMonitorIdPayment will redirect
      await initiateParkMonitorIdPayment();
    });
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Claim Your ID Card</CardTitle>
        <CardDescription>
          Add your passport photo for the ID card, then proceed to make the ₦20,000 ID Card fee payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">Passport Photo</label>
          <PassportPhotoInput
            value={photoUrl}
            onChange={handlePhotoChange}
            onBusyChange={setIsUploading}
            disabled={isPending}
          />
        </div>

        <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-semibold text-slate-900">ID Card Fee</p>
            <p className="text-sm text-slate-500">Required for ID generation</p>
          </div>
          <div className="text-lg font-bold">₦20,000</div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={!photoUrl || isPending || isUploading}
          className="w-full h-12 text-base font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Redirecting to Payment...
            </>
          ) : (
            "Pay & Claim ID"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
