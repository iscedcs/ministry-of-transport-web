"use client";

import { useState } from "react";
import { PassportPhotoInput } from "@/components/park-monitor/passport-photo-input";
import { setParkMonitorPhotoByStaff } from "@/app/actions/park-monitor";

/**
 * Lets the officer onboarding an applicant add or replace the passport photo
 * after the form was submitted — saved immediately, like the claim-ID page.
 */
export function PhotoControl({
  applicationId,
  initialUrl,
}: {
  applicationId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string | null) {
    const previous = url;
    setUrl(next);
    setError(null);

    const saved = await setParkMonitorPhotoByStaff(applicationId, next);
    if (!saved.success) {
      setUrl(previous);
      setError(saved.error ?? "Could not save the photo.");
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <PassportPhotoInput value={url} onChange={handleChange} />
    </div>
  );
}
