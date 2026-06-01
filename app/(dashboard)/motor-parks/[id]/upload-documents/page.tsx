"use client";

/**
 * Upload Documents Page — Ministry of Transport Platform
 * STORY-022 | FR-010
 *
 * Applicant uploads CAC registration certificate and land ownership /
 * lease agreement after submitting the initial motor park application.
 * Documents are provided as publicly accessible URLs (Google Drive, etc.)
 * until a full file-storage integration (Uploadthing/Vercel Blob) is added.
 *
 * Access: EXTERNAL_APPLICANT (own parks only)
 */

import { updateParkDocuments } from "@/app/actions/motor-park";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ActionResult } from "@/lib/server-actions-pattern";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

type UploadState = ActionResult | undefined;

export default function UploadDocumentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<UploadState, FormData>(
    updateParkDocuments as (
      s: UploadState,
      f: FormData,
    ) => Promise<UploadState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <Link
            href={`/motor-parks/${parkId}`}
            className="hover:text-foreground transition-colors">
            Application
          </Link>
          <span>/</span>
          <span className="text-foreground">Upload Documents</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Upload Supporting Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-010 — Attach your CAC registration certificate and land
          ownership/lease agreement to your motor park application.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How to submit documents:</strong>{" "}
          Upload your documents directly from your device. The files will be
          securely stored and made available to the appropriate review teams.
        </p>
      </div>

      <form action={action} encType="multipart/form-data" noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Documents</CardTitle>
            <CardDescription>
              Upload one or both documents below. At least one file is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* CAC Document */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cacDocument">CAC Registration Certificate </Label>
              <input
                id="cacDocument"
                name="cacDocument"
                type="file"
                accept="application/pdf,image/*"
                className="file-input"
              />
              <p className="text-xs text-muted-foreground">
                {`Certificate of incorporation from the Corporate Affairs
                Commission (CAC).`}
              </p>
            </div>

            <Separator />

            {/* Land Ownership Document */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="landOwnershipDoc">
                {`Land Ownership / Lease Agreement`}
              </Label>
              <input
                id="landOwnershipDoc"
                name="landOwnershipDoc"
                type="file"
                accept="application/pdf,image/*"
                className="file-input"
              />
              <p className="text-xs text-muted-foreground">
                {`Proof of land ownership or a valid lease agreement for the
                proposed motor park site.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Saving…" : "Save Documents"}
          </Button>
        </div>
      </form>
    </div>
  );
}
