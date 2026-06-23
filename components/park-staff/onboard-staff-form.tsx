"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboardParkStaff } from "@/app/actions/park-staff";
import { uploadGenericDocument } from "@/app/actions/upload";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export function OnboardStaffForm({ parkId }: { parkId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadGenericDocument(file, "passports", "PARK_STAFF");
      if (result.success) {
        setPhotoUrl(result.url);
      } else {
        setUploadError(result.error);
      }
    } catch (e) {
      setUploadError("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photoUrl) {
      alert("Please upload a passport photo for the staff member.");
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    
    const res = await onboardParkStaff({
      motorParkId: parkId,
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      photoUrl: photoUrl,
    });

    if (res.success) {
      router.push(`/motor-parks/${parkId}/staff`);
      router.refresh();
    } else {
      alert(res.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div>
        <label className="text-sm font-medium">Full Name</label>
        <Input name="name" required placeholder="John Doe" />
      </div>
      <div>
        <label className="text-sm font-medium">Role</label>
        <Input name="role" required placeholder="Ticketer, Manager, Driver..." />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Passport Photo</label>
        {uploadError && (
          <p className="text-xs text-red-500">{uploadError}</p>
        )}
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
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
              <span className="font-medium">
                {isUploading ? "Uploading photo..." : "Click to upload photo"}
              </span>
              <span className="text-xs">JPG, PNG, WEBP</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-secondary/10">
            <div className="relative w-16 h-16 rounded overflow-hidden bg-slate-100 border border-border">
              <Image src={photoUrl} alt="Passport Photo" fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm flex items-center text-green-600">
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
                <span className="text-xs font-medium text-primary hover:underline cursor-pointer">
                  {isUploading ? "Uploading..." : "Replace"}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <Button disabled={loading || isUploading || !photoUrl} className="w-full">
        {loading ? "Onboarding..." : "Onboard Staff"}
      </Button>
    </form>
  );
}
