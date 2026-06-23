"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { uploadGenericDocument } from "@/app/actions/upload";
import { updateParkMonitorPhoto } from "@/app/actions/park-monitor";
import { initiateParkMonitorIdPayment } from "@/app/actions/payments";
import Image from "next/image";

export function ClaimIdForm({ currentPhotoUrl }: { currentPhotoUrl?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      // Use the new generic upload. We override prefix inside route by reading the env if needed,
      // but generic document sets linkedToType.
      const result = await uploadGenericDocument(file, "passports", "PARK_MONITOR_APP");
      if (result.success) {
        setPhotoUrl(result.url);
        // Save to application immediately
        await updateParkMonitorPhoto(result.url);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePayment = () => {
    if (!photoUrl) {
      setError("Please upload a passport photo first.");
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
          Upload your passport photo for the ID card, then proceed to make the ₦20,000 ID Card fee payment.
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
          {!photoUrl ? (
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <input
                type="file"
                id="photoFile"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUpload(file);
                  }
                }}
              />
              <label
                htmlFor="photoFile"
                className="cursor-pointer flex flex-col items-center gap-2 text-slate-500 hover:text-slate-900"
              >
                <Upload className="w-8 h-8" />
                <span className="font-medium">
                  {isUploading ? "Uploading..." : "Click to upload photo"}
                </span>
                <span className="text-xs">JPG, PNG, WEBP</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="relative w-16 h-16 rounded overflow-hidden bg-slate-100">
                <Image src={photoUrl} alt="Passport Photo" fill className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm flex items-center text-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Photo Uploaded
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="replacePhoto"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <label htmlFor="replacePhoto">
                  <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                    Replace
                  </span>
                </label>
              </div>
            </div>
          )}
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
