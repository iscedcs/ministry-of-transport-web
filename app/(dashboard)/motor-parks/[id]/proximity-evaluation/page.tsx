"use client";

/**
 * Proximity Evaluation Page — Ministry of Transport Platform
 * STORY-028 | FR-015
 *
 * Field inspector records the proximity evaluation during re-inspection.
 * Evaluates 3 factors per the Parks Standards:
 *   1. Proximity to an existing public park
 *   2. Proximity to a major transport route or public road
 *   3. Proximity to a major road intersection
 *
 * Verdict:
 *   PASS        → applicationStatus → PENDING_APPROVAL
 *   CONDITIONAL → applicationStatus → PENDING_APPROVAL (with conditions)
 *   FAIL        → applicationStatus → REJECTED
 *
 * Access: FIELD_INSPECTOR, HOD_PARKS, HOD_VIS, HOD_TRANSPORT_OPS, HOD_PARKS_REVALIDATION
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { recordProximityEvaluation } from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type ProximityState = ActionResult | undefined;

type FactorValue = "yes" | "no" | "";

export default function ProximityEvaluationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [nearPublicPark, setNearPublicPark] = useState<FactorValue>("");
  const [nearMajorRoad, setNearMajorRoad] = useState<FactorValue>("");
  const [nearIntersection, setNearIntersection] = useState<FactorValue>("");
  const [verdict, setVerdict] = useState("");

  const [state, action, isPending] = useActionState<ProximityState, FormData>(
    recordProximityEvaluation as (
      s: ProximityState,
      f: FormData,
    ) => Promise<ProximityState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  const allFactorsFilled =
    nearPublicPark !== "" && nearMajorRoad !== "" && nearIntersection !== "";

  const verdictColour =
    verdict === "PASS"
      ? "text-green-600 dark:text-green-400"
      : verdict === "CONDITIONAL"
        ? "text-amber-600 dark:text-amber-400"
        : verdict === "FAIL"
          ? "text-destructive"
          : "";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
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
          <span className="text-foreground">Proximity Evaluation</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Proximity Evaluation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-015 — Evaluate the proposed site&rsquo;s proximity to public parks, major
          transport routes, and road intersections during re-inspection.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <div className="flex flex-col gap-4">
          {/* Factor 1: Public park */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Factor 1 — Proximity to Public Park
              </CardTitle>
              <CardDescription className="text-xs">
                Is the proposed site within a notable proximity to an existing
                public park or recreational area?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Label className="text-sm shrink-0">Within proximity?</Label>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="nearPublicPark"
                        value={v}
                        checked={nearPublicPark === v}
                        onChange={() => setNearPublicPark(v)}
                        className="accent-primary"
                      />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>
              {nearPublicPark === "yes" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="publicParkDistanceM" className="text-xs">
                    Approximate distance (metres)
                  </Label>
                  <Input
                    id="publicParkDistanceM"
                    name="publicParkDistanceM"
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    className="max-w-[160px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factor 2: Major transport route */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Factor 2 — Proximity to Major Transport Route / Public Road
              </CardTitle>
              <CardDescription className="text-xs">
                Is the site adjacent to or within a notable proximity of a major
                transport route or busy public road?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Label className="text-sm shrink-0">Within proximity?</Label>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="nearMajorRoad"
                        value={v}
                        checked={nearMajorRoad === v}
                        onChange={() => setNearMajorRoad(v)}
                        className="accent-primary"
                      />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>
              {nearMajorRoad === "yes" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="majorRoadDistanceM" className="text-xs">
                    Approximate distance (metres)
                  </Label>
                  <Input
                    id="majorRoadDistanceM"
                    name="majorRoadDistanceM"
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    className="max-w-[160px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factor 3: Road intersection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Factor 3 — Proximity to Major Road Intersection
              </CardTitle>
              <CardDescription className="text-xs">
                Is the site within proximity of a major road junction or
                intersection that could cause traffic hazards?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Label className="text-sm shrink-0">Within proximity?</Label>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="nearIntersection"
                        value={v}
                        checked={nearIntersection === v}
                        onChange={() => setNearIntersection(v)}
                        className="accent-primary"
                      />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>
              {nearIntersection === "yes" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="intersectionDistanceM" className="text-xs">
                    Approximate distance (metres)
                  </Label>
                  <Input
                    id="intersectionDistanceM"
                    name="intersectionDistanceM"
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    className="max-w-[160px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Verdict */}
          <Card className={verdict === "FAIL" ? "border-destructive/40" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Overall Proximity Verdict
              </CardTitle>
              <CardDescription className="text-xs">
                Based on all three factors, record your overall evaluation
                verdict. PASS / CONDITIONAL advances to final approval. FAIL
                rejects the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proximityVerdict">Verdict</Label>
                <Select
                  name="proximityVerdict"
                  value={verdict}
                  onValueChange={setVerdict}
                  required>
                  <SelectTrigger
                    id="proximityVerdict"
                    className="max-w-[240px]">
                    <SelectValue placeholder="Select verdict…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">
                      ✅ PASS — Site is suitable
                    </SelectItem>
                    <SelectItem value="CONDITIONAL">
                      ⚠️ CONDITIONAL — Suitable with conditions
                    </SelectItem>
                    <SelectItem value="FAIL">
                      ❌ FAIL — Site not suitable
                    </SelectItem>
                  </SelectContent>
                </Select>
                {verdict && (
                  <p className={`text-xs font-medium ${verdictColour}`}>
                    {verdict === "PASS" &&
                      "Application will advance to Pending Final Approval."}
                    {verdict === "CONDITIONAL" &&
                      "Application will advance to Pending Final Approval with conditions."}
                    {verdict === "FAIL" &&
                      "Application will be rejected. This action cannot be undone."}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proximityNotes">
                  Evaluation Notes{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="proximityNotes"
                  name="proximityNotes"
                  placeholder="Describe the proximity findings and any conditions attached to the verdict…"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={isPending || !allFactorsFilled || !verdict}
            aria-busy={isPending}
            variant={verdict === "FAIL" ? "destructive" : "default"}>
            {isPending ? "Recording…" : "Submit Proximity Evaluation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
