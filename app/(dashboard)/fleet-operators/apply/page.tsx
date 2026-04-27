"use client";

/**
 * Fleet Application Form — Ministry of Transport Platform
 * STORY-041 / STORY-042 | FR-020 / FR-021 / FR-022
 *
 * Two-section form:
 *  1. Company details (FR-020 required documents)
 *  2. Dynamic vehicle list — minimum 5 vehicles enforced (FR-021)
 *     Each vehicle: type, make, model, reg no, engine/chassis no, routes, roadworthiness (FR-022)
 *
 * Access: EXTERNAL_APPLICANT
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitFleetApplication } from "@/app/actions/mass-transit";
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
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────────

type VehicleType = "BUS" | "MINIBUS" | "TRUCK" | "LIGHT_COMMERCIAL" | "TANKER";

interface VehicleEntry {
  id: string; // local key only
  registrationNumber: string;
  vehicleType: VehicleType | "";
  make: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  assignedDriverName: string;
  assignedDriverPhone: string;
  routesServed: string;
  roadworthinessExpiry: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "BUS", label: "Bus" },
  { value: "MINIBUS", label: "Minibus" },
  { value: "TRUCK", label: "Truck" },
  { value: "LIGHT_COMMERCIAL", label: "Light Commercial" },
  { value: "TANKER", label: "Tanker" },
];

function emptyVehicle(): VehicleEntry {
  return {
    id: Math.random().toString(36).slice(2),
    registrationNumber: "",
    vehicleType: "",
    make: "",
    model: "",
    engineNumber: "",
    chassisNumber: "",
    assignedDriverName: "",
    assignedDriverPhone: "",
    routesServed: "",
    roadworthinessExpiry: "",
  };
}

// ── Vehicle Card ───────────────────────────────────────────────────────────────

function VehicleCard({
  index,
  vehicle,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  vehicle: VehicleEntry;
  onChange: (id: string, field: keyof VehicleEntry, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Vehicle {index + 1}
            {vehicle.registrationNumber && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {vehicle.registrationNumber}
              </Badge>
            )}
          </CardTitle>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(vehicle.id)}
              className="text-xs text-destructive hover:underline">
              Remove
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`reg-${vehicle.id}`}>
            Registration Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`reg-${vehicle.id}`}
            value={vehicle.registrationNumber}
            onChange={(e) =>
              onChange(vehicle.id, "registrationNumber", e.target.value)
            }
            placeholder="e.g. ABC-123-XY"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`type-${vehicle.id}`}>
            Vehicle Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={vehicle.vehicleType}
            onValueChange={(v) => onChange(vehicle.id, "vehicleType", v)}>
            <SelectTrigger id={`type-${vehicle.id}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`make-${vehicle.id}`}>
            Make <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`make-${vehicle.id}`}
            value={vehicle.make}
            onChange={(e) => onChange(vehicle.id, "make", e.target.value)}
            placeholder="e.g. Mercedes-Benz"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`model-${vehicle.id}`}>
            Model <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`model-${vehicle.id}`}
            value={vehicle.model}
            onChange={(e) => onChange(vehicle.id, "model", e.target.value)}
            placeholder="e.g. Sprinter 515"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`engine-${vehicle.id}`}>
            Engine Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`engine-${vehicle.id}`}
            value={vehicle.engineNumber}
            onChange={(e) =>
              onChange(vehicle.id, "engineNumber", e.target.value)
            }
            placeholder="Engine no."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`chassis-${vehicle.id}`}>
            Chassis Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`chassis-${vehicle.id}`}
            value={vehicle.chassisNumber}
            onChange={(e) =>
              onChange(vehicle.id, "chassisNumber", e.target.value)
            }
            placeholder="Chassis no."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`driver-${vehicle.id}`}>Assigned Driver Name</Label>
          <Input
            id={`driver-${vehicle.id}`}
            value={vehicle.assignedDriverName}
            onChange={(e) =>
              onChange(vehicle.id, "assignedDriverName", e.target.value)
            }
            placeholder="Driver full name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`driverPhone-${vehicle.id}`}>
            Driver Phone Number
          </Label>
          <Input
            id={`driverPhone-${vehicle.id}`}
            value={vehicle.assignedDriverPhone}
            onChange={(e) =>
              onChange(vehicle.id, "assignedDriverPhone", e.target.value)
            }
            placeholder="e.g. 08012345678"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`routes-${vehicle.id}`}>
            Routes Served (comma-separated)
          </Label>
          <Input
            id={`routes-${vehicle.id}`}
            value={vehicle.routesServed}
            onChange={(e) =>
              onChange(vehicle.id, "routesServed", e.target.value)
            }
            placeholder="e.g. Awka–Onitsha, Awka–Enugu"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`roadworthy-${vehicle.id}`}>
            Roadworthiness Expiry Date
          </Label>
          <Input
            id={`roadworthy-${vehicle.id}`}
            type="date"
            value={vehicle.roadworthinessExpiry}
            onChange={(e) =>
              onChange(vehicle.id, "roadworthinessExpiry", e.target.value)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function ApplyFleetPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [vehicles, setVehicles] = useState<VehicleEntry[]>([
    emptyVehicle(),
    emptyVehicle(),
    emptyVehicle(),
    emptyVehicle(),
    emptyVehicle(),
  ]);

  function updateVehicle(id: string, field: keyof VehicleEntry, value: string) {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  }

  function addVehicle() {
    setVehicles((prev) => [...prev, emptyVehicle()]);
  }

  function removeVehicle(id: string) {
    if (vehicles.length <= 5) return;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    if (vehicles.length < 5) {
      setError("Minimum 5 vehicles required (FR-021).");
      return;
    }

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    fd.set(
      "vehiclesJson",
      JSON.stringify(
        vehicles.map((v) => ({
          registrationNumber: v.registrationNumber,
          vehicleType: v.vehicleType,
          make: v.make,
          model: v.model,
          engineNumber: v.engineNumber,
          chassisNumber: v.chassisNumber,
          assignedDriverName: v.assignedDriverName || undefined,
          assignedDriverPhone: v.assignedDriverPhone || undefined,
          routesServed: v.routesServed || undefined,
          roadworthinessExpiry: v.roadworthinessExpiry || undefined,
        })),
      ),
    );

    startTransition(async () => {
      const result: ActionResult<{ companyId: string }> =
        await submitFleetApplication(undefined, fd);
      if (result.success) {
        router.push(`/fleet-operators/${result.data!.companyId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <span>New Application</span>
        </nav>
        <h1 className="text-2xl font-semibold">
          Mass Transit Registration Application
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register your mass transit company and fleet with the Ministry of
          Transport.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          <strong>Requirements (FR-020/FR-021):</strong> You must declare a
          minimum of 5 branded vehicles. Each vehicle requires its type, make,
          model, registration number, engine number, chassis number, routes
          served, and roadworthiness report.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── Company Details ── */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>
              As stated in your Certificate of Incorporation and registration
              documents
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Registered company name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cacNumber">
                CAC Registration Number{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cacNumber"
                name="cacNumber"
                placeholder="e.g. RC:9428574"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asinNumber">
                ASIN Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="asinNumber"
                name="asinNumber"
                placeholder="16-digit ASIN"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessPremisesCert">
                Business Premises Certificate
              </Label>
              <Input
                id="businessPremisesCert"
                name="businessPremisesCert"
                placeholder="Certificate number or URL"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ansaaRegistration">
                ANSAA Registration Certificate
              </Label>
              <Input
                id="ansaaRegistration"
                name="ansaaRegistration"
                placeholder="ANSAA certificate number"
              />
            </div>

            <Separator className="sm:col-span-2" />

            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">
                Contact Person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                placeholder="Full name of contact"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">
                Contact Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="e.g. 08012345678"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="company@example.com"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="terminalLocationAddress">
                Terminal / Depot Address{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="terminalLocationAddress"
                name="terminalLocationAddress"
                placeholder="Full terminal address including LGA and state"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gpsCoordinates">GPS Coordinates (optional)</Label>
              <Input
                id="gpsCoordinates"
                name="gpsCoordinates"
                placeholder="lat,lon — e.g. 6.2088,6.9996"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Vehicle Fleet ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Vehicle Fleet{" "}
                <span
                  className={
                    vehicles.length >= 5
                      ? "text-sm font-normal text-green-600"
                      : "text-sm font-normal text-destructive"
                  }>
                  ({vehicles.length} / 5 minimum)
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Declare each vehicle in your branded fleet (FR-022)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVehicle}>
              + Add Vehicle
            </Button>
          </div>

          {vehicles.map((v, i) => (
            <VehicleCard
              key={v.id}
              index={i}
              vehicle={v}
              onChange={updateVehicle}
              onRemove={removeVehicle}
              canRemove={vehicles.length > 5}
            />
          ))}
        </div>

        {/* hidden field populated on submit */}
        <input type="hidden" name="vehiclesJson" />

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={isPending || vehicles.length < 5}>
            {isPending ? "Submitting…" : "Submit Application"}
          </Button>
          <Button asChild variant="outline" disabled={isPending}>
            <Link href="/fleet-operators">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
