"use client";

/**
 * Fleet Change Notification — Ministry of Transport Platform
 * STORY-048 | FR-028
 *
 * External applicant removes a vehicle from the active fleet.
 * Minimum 5 vehicles must remain.
 *
 * Access: EXTERNAL_APPLICANT (permit status ACTIVE)
 */

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getFleetApplication, removeVehicle } from "@/app/actions/mass-transit";
import type { FleetApplicationDetail } from "@/app/actions/mass-transit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FleetChangePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [company, setCompany] = useState<FleetApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [removalReason, setRemovalReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getFleetApplication(companyId).then((r) => {
      if (r.success) setCompany(r.data!);
      setLoading(false);
    });
  }, [companyId]);

  function handleRemove() {
    if (!selectedVehicleId) return;
    const fd = new FormData();
    fd.set("vehicleId", selectedVehicleId);
    fd.set("companyId", companyId);
    fd.set("removalReason", removalReason);

    startTransition(async () => {
      const result = await removeVehicle(undefined, fd);
      if (result.success) {
        router.push(`/fleet-operators/${companyId}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!company) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Fleet application not found.</AlertDescription>
      </Alert>
    );
  }

  const MIN_FLEET = 5;
  const canRemove = company.vehicles.length > MIN_FLEET;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
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
            {company.companyName}
          </Link>
          {" / "}
          <span>Fleet Change Notification</span>
        </nav>
        <h1 className="text-2xl font-semibold">Fleet Change Notification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-028: Notify the Ministry of Transport of a fleet composition
          change. The minimum fleet size of {MIN_FLEET} vehicles must be
          maintained.
        </p>
      </div>

      {!canRemove && (
        <Alert variant="destructive">
          <AlertDescription>
            Your fleet currently has {company.vehicles.length} vehicle
            {company.vehicles.length !== 1 ? "s" : ""}, which is the minimum
            required. You cannot remove any vehicle at this time.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {canRemove && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remove a Vehicle</CardTitle>
            <CardDescription>
              Select the vehicle to deregister from your fleet (
              {company.vehicles.length} vehicles — {MIN_FLEET} minimum)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {company.vehicles.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVehicleId === v.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}>
                  <input
                    type="radio"
                    name="selectedVehicle"
                    value={v.id}
                    checked={selectedVehicleId === v.id}
                    onChange={() => setSelectedVehicleId(v.id)}
                    className="accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium">
                      {v.registrationNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {v.vehicleType} — {v.make} {v.model}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="removalReason">
                Reason for Removal{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="removalReason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g. Vehicle sold, written off, retired from service"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                disabled={!selectedVehicleId || isPending}
                onClick={handleRemove}>
                {isPending ? "Processing…" : "Submit Fleet Change"}
              </Button>
              <Button asChild variant="outline" disabled={isPending}>
                <Link href={`/fleet-operators/${companyId}`}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!canRemove && (
        <Button asChild variant="outline">
          <Link href={`/fleet-operators/${companyId}`}>← Back to Company</Link>
        </Button>
      )}
    </div>
  );
}
