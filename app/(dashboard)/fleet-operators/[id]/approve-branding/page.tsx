"use client";

/**
 * Approve Branding Scheme — Ministry of Transport Platform
 * STORY-044 | FR-025
 *
 * Commissioner / PS approves the company's branding colour scheme,
 * moves status to PENDING_APPROVAL.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { approveBrandingScheme } from "@/app/actions/mass-transit";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type BrandState = ActionResult | undefined;

export default function ApproveBrandingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [hexColour, setHexColour] = useState("#1d4ed8");

  const [state, action, isPending] = useActionState<BrandState, FormData>(
    approveBrandingScheme as (
      s: BrandState,
      f: FormData,
    ) => Promise<BrandState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/fleet-operators/${companyId}`);
    }
  }, [state, companyId, router]);

  const err = state && !state.success ? state.error : undefined;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <Link
            href={`/fleet-operators/${companyId}`}
            className="hover:underline">
            Company
          </Link>
          {" / "}
          <span>Approve Branding</span>
        </nav>
        <h1 className="text-2xl font-semibold">Approve Branding Scheme</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-025: Approve the company's official brand colour for vehicle
          identification. Status will move to Pending Approval.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Colour</CardTitle>
            <CardDescription>
              Select or enter the approved hex colour code
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="companyId" value={companyId} />

            <div className="space-y-1.5">
              <Label htmlFor="approvedColour">
                Approved Colour <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={hexColour}
                  onChange={(e) => setHexColour(e.target.value)}
                  className="h-10 w-14 rounded border border-input cursor-pointer"
                  aria-label="Colour picker"
                />
                <Input
                  id="approvedColour"
                  name="approvedColour"
                  value={hexColour}
                  onChange={(e) => setHexColour(e.target.value)}
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="font-mono"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be a valid hex colour (e.g. <code>#1d4ed8</code>).
              </p>
            </div>

            <div
              className="h-16 w-full rounded-lg border border-border flex items-center justify-center"
              style={{ backgroundColor: hexColour }}>
              <span className="text-white text-sm font-medium drop-shadow-sm">
                Preview — {hexColour}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brandingSchemeDetails">
                Brand Scheme Notes (optional)
              </Label>
              <Textarea
                id="brandingSchemeDetails"
                name="brandingSchemeDetails"
                placeholder="Additional notes on livery requirements, logo placement, etc."
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Approving…" : "Approve Branding Scheme"}
              </Button>
              <Button asChild variant="outline" disabled={isPending}>
                <Link href={`/fleet-operators/${companyId}`}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
