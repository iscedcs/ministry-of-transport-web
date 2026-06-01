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
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  recordProximityEvaluation,
  getMotorPark,
} from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calculator, AlertTriangle } from "lucide-react";

type ProximityState = ActionResult | undefined;

type FactorValue = "yes" | "no" | "";

const SENSITIVE_INTERSECTIONS = [
  { name: "Arroma Junction, Awka", lat: 6.2209, lng: 7.0731 },
  { name: "Unizik Junction, Awka", lat: 6.2251, lng: 7.0812 },
  { name: "Amawbia Junction, Awka", lat: 6.2045, lng: 7.0422 },
  { name: "Upper Iweka, Onitsha", lat: 6.1345, lng: 6.8012 },
  { name: "Bridge Head, Onitsha", lat: 6.1329, lng: 6.7823 },
  { name: "Ekwulobia Roundabout", lat: 6.0278, lng: 7.0825 },
];

function calculateHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function DistancePills({
  value,
  onChange,
  options = [50, 100, 150, 200, 300, 500],
  name,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: number[];
  name?: string;
  id?: string;
}) {
  const numValue = parseInt(value, 10);
  const isPillMatch = !isNaN(numValue) && options.includes(numValue);
  const [explicitCustomMode, setExplicitCustomMode] = useState(false);
  
  const isCustomMode = explicitCustomMode || (value !== "" && !isPillMatch);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {options.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => {
            onChange(String(p));
            setExplicitCustomMode(false);
          }}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
            !isCustomMode && value === String(p)
              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
              : "bg-secondary/60 text-foreground border-border hover:bg-primary/10 hover:border-primary/50"
          }`}
        >
          {p}m
        </button>
      ))}
      {!isCustomMode ? (
        <button
          type="button"
          onClick={() => setExplicitCustomMode(true)}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        >
          custom…
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            name={name}
            type="number"
            min="0"
            value={value}
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            className="w-24 h-8 text-xs px-2 py-1"
            placeholder="e.g. 150"
          />
          <span className="text-xs text-muted-foreground font-medium">metres</span>
        </div>
      )}
      {!isCustomMode && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

export default function ProximityEvaluationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [motorPark, setMotorPark] = useState<any>(null);

  const [nearPublicPark, setNearPublicPark] = useState<FactorValue>("");
  const [nearMajorRoad, setNearMajorRoad] = useState<FactorValue>("");
  const [nearIntersection, setNearIntersection] = useState<FactorValue>("");
  const [verdict, setVerdict] = useState("");

  const [selectedIntersection, setSelectedIntersection] = useState("");
  const [suggestedDistance, setSuggestedDistance] = useState<number | null>(
    null,
  );
  const [intersectionDistance, setIntersectionDistance] = useState("");
  const [publicParkDistance, setPublicParkDistance] = useState("");
  const [majorRoadDistance, setMajorRoadDistance] = useState("");
  const [tooClose, setTooClose] = useState(false);

  const [state, action, isPending] = useActionState<ProximityState, FormData>(
    recordProximityEvaluation as (
      s: ProximityState,
      f: FormData,
    ) => Promise<ProximityState>,
    undefined,
  );

  useEffect(() => {
    getMotorPark(parkId).then((result) => {
      if (result.success) {
        setMotorPark(result.data);
      }
    });
  }, [parkId]);

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  useEffect(() => {
    if (!selectedIntersection || !motorPark?.gpsCoordinates) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestedDistance(null);
       
      setTooClose(false);
      return;
    }

    const intersectionObj = SENSITIVE_INTERSECTIONS.find(
      (i) => i.name === selectedIntersection,
    );
    if (!intersectionObj) return;

    // Parse park GPS coordinates
    const coordsStr = motorPark.gpsCoordinates.trim();
    const parts = coordsStr.split(/[\s,]+/);
    const parkLat = parseFloat(parts[0]);
    const parkLng = parseFloat(parts[1]);

    if (isNaN(parkLat) || isNaN(parkLng)) {
       
      setSuggestedDistance(null);
       
      setTooClose(false);
      return;
    }

    // Calculate distance
    const dist = calculateHaversine(
      parkLat,
      parkLng,
      intersectionObj.lat,
      intersectionObj.lng,
    );

     
    setSuggestedDistance(dist);
    // Mark as too close if within 150 meters
     
    setTooClose(dist < 150);
  }, [selectedIntersection, motorPark]);

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
          FR-015 — Evaluate the proposed site&rsquo;s proximity to public parks,
          major transport routes, and road intersections during re-inspection.
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
                  <DistancePills
                    id="publicParkDistanceM"
                    name="publicParkDistanceM"
                    value={publicParkDistance}
                    onChange={setPublicParkDistance}
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
                  <DistancePills
                    id="majorRoadDistanceM"
                    name="majorRoadDistanceM"
                    value={majorRoadDistance}
                    onChange={setMajorRoadDistance}
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
                <div className="flex flex-col gap-4 border border-border/50 rounded-lg p-3 bg-secondary/10 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sensitiveIntersection" className="text-xs">
                      Analyze Distance to Sensitive Major Intersection
                    </Label>
                    <Select
                      name="sensitiveIntersection"
                      value={selectedIntersection}
                      onValueChange={setSelectedIntersection}>
                      <SelectTrigger
                        id="sensitiveIntersection"
                        className="bg-background">
                        <SelectValue placeholder="Select sensitive intersection…" />
                      </SelectTrigger>
                      <SelectContent>
                        {SENSITIVE_INTERSECTIONS.map((i) => (
                          <SelectItem key={i.name} value={i.name}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {motorPark?.gpsCoordinates ? (
                    <div className="text-[11px] text-muted-foreground bg-background p-2 rounded border border-border/40">
                      Site Coordinates registered:{" "}
                      <span className="font-semibold text-foreground">
                        {motorPark.gpsCoordinates}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                      No coordinates registered for this park. Intersection
                      calculator requires site coordinates.
                    </div>
                  )}

                  {suggestedDistance !== null && (
                    <div className="flex flex-col gap-2 bg-background p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5 text-primary" />
                          Calculated Distance:
                        </span>
                        <span className="font-bold text-foreground">
                          {suggestedDistance} metres
                        </span>
                      </div>

                      {tooClose && (
                        <div className="flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/5 p-2 rounded border border-destructive/20 mt-1 font-semibold leading-normal">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
                          <span>
                            WARNING: Proposed site is too close (under 150m) to
                            this sensitive intersection!
                          </span>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setIntersectionDistance(String(suggestedDistance))
                        }
                        className="text-[10px] w-fit mt-1 self-end">
                        Use Suggested Distance
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="intersectionDistanceM" className="text-xs">
                      Approximate distance (metres)
                    </Label>
                    <DistancePills
                      id="intersectionDistanceM"
                      name="intersectionDistanceM"
                      value={intersectionDistance}
                      onChange={setIntersectionDistance}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id="tooCloseToSensitiveIntersection"
                      name="tooCloseToSensitiveIntersection"
                      checked={tooClose}
                      onCheckedChange={(v) => setTooClose(!!v)}
                    />
                    <label
                      htmlFor="tooCloseToSensitiveIntersection"
                      className="text-xs font-semibold text-destructive cursor-pointer">
                      Flag as &quot;too close&quot; to a sensitive intersection
                    </label>
                  </div>
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
                  <SelectTrigger id="proximityVerdict" className="max-w-60">
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
