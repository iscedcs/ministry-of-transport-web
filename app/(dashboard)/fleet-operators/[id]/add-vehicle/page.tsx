"use client";

/**
 * Add Vehicle — Ministry of Transport Platform
 * STORY-042 | FR-022 / FR-028
 *
 * External applicant adds a single vehicle to the fleet during application.
 *
 * Access: EXTERNAL_APPLICANT (application status SUBMITTED / UNDER_REVIEW)
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addVehicle } from "@/app/actions/mass-transit";
import type { ActionResult } from "@/lib/server-actions-pattern";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type AddVehicleState = ActionResult | undefined;

export default function AddVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [vehicleType, setVehicleType] = useState("");

  const [state, action, isPending] = useActionState<AddVehicleState, FormData>(
    addVehicle as (s: AddVehicleState, f: FormData) => Promise<AddVehicleState>,
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
          <span>Add Vehicle</span>
        </nav>
        <h1 className="text-2xl font-semibold">Add Vehicle to Fleet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-022: Register an additional vehicle in your fleet.
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
            <CardTitle className="text-base">Vehicle Details</CardTitle>
            <CardDescription>
              Provide the vehicle&rsquo;s technical and registration information
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="companyId" value={companyId} />

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="registrationNumber">
                Registration Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                placeholder="e.g. ABC-123-XY"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleType">
                Vehicle Type <span className="text-destructive">*</span>
              </Label>
              <Select
                name="vehicleType"
                value={vehicleType}
                onValueChange={setVehicleType}
                required>
                <SelectTrigger id="vehicleType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUS">Bus</SelectItem>
                  <SelectItem value="MINIBUS">Minibus</SelectItem>
                  <SelectItem value="TRUCK">Truck</SelectItem>
                  <SelectItem value="LIGHT_COMMERCIAL">
                    Light Commercial
                  </SelectItem>
                  <SelectItem value="TANKER">Tanker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="make">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input
                id="make"
                name="make"
                placeholder="e.g. Mercedes-Benz"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                name="model"
                placeholder="e.g. Sprinter 515"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="engineNumber">
                Engine Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="engineNumber"
                name="engineNumber"
                placeholder="Engine no."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chassisNumber">
                Chassis Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="chassisNumber"
                name="chassisNumber"
                placeholder="Chassis no."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignedDriverName">Assigned Driver Name</Label>
              <Input
                id="assignedDriverName"
                name="assignedDriverName"
                placeholder="Driver full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignedDriverPhone">Driver Phone Number</Label>
              <Input
                id="assignedDriverPhone"
                name="assignedDriverPhone"
                placeholder="e.g. 08012345678"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="routesServed">
                Routes Served (comma-separated)
              </Label>
              <Input
                id="routesServed"
                name="routesServed"
                placeholder="e.g. Awka–Onitsha, Awka–Enugu"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="roadworthinessExpiry">
                Roadworthiness Expiry Date
              </Label>
              <Input
                id="roadworthinessExpiry"
                name="roadworthinessExpiry"
                type="date"
              />
            </div>

            <div className="sm:col-span-2">
              <Separator className="my-2" />
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={isPending || !vehicleType}>
                {isPending ? "Adding…" : "Add Vehicle"}
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
