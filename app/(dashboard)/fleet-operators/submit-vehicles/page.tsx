"use client";

/**
 * Vehicle Submission Form — Ministry of Transport Platform
 * STORY-041 | FR-022 (deferred vehicle submission)
 *
 * Applicants respond to vehicle submission requests by providing
 * detailed information for each vehicle (registration number, make,
 * model, engine/chassis numbers, routes, roadworthiness expiry).
 *
 * Access: EXTERNAL_APPLICANT
 */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPendingVehicleSubmissionRequests,
  submitVehicleDetails,
} from "@/app/actions/mass-transit";
import { getSession } from "@/lib/auth";
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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type VehicleType = "BUS" | "MINIBUS" | "TRUCK" | "LIGHT_COMMERCIAL" | "TANKER";

interface VehicleDetailsEntry {
  id: string; // local key
  registrationNumber: string;
  vehicleType: VehicleType | "";
  make: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  routesServed: string;
  roadworthinessExpiry: string;
}

interface PendingRequest {
  id: string;
  companyName: string;
  vehicleCount: number;
  requestedAt: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "BUS", label: "Bus" },
  { value: "MINIBUS", label: "Minibus" },
  { value: "TRUCK", label: "Truck" },
  { value: "LIGHT_COMMERCIAL", label: "Light Commercial" },
  { value: "TANKER", label: "Tanker" },
];

function emptyVehicle(): VehicleDetailsEntry {
  return {
    id: Math.random().toString(36).slice(2),
    registrationNumber: "",
    vehicleType: "",
    make: "",
    model: "",
    engineNumber: "",
    chassisNumber: "",
    routesServed: "",
    roadworthinessExpiry: "",
  };
}

// ── Helpers -----------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

// ── Vehicle Card ───────────────────────────────────────────────────────────

function VehicleCard({
  index,
  vehicle,
  onChange,
  errors,
}: {
  index: number;
  vehicle: VehicleDetailsEntry;
  onChange: (id: string, field: keyof VehicleDetailsEntry, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Vehicle {index + 1}
          {vehicle.registrationNumber && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {vehicle.registrationNumber}
            </span>
          )}
        </CardTitle>
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
          <FieldError message={errors[`${vehicle.id}.registrationNumber`]} />
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
          <FieldError message={errors[`${vehicle.id}.vehicleType`]} />
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
          <FieldError message={errors[`${vehicle.id}.make`]} />
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
          <FieldError message={errors[`${vehicle.id}.model`]} />
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
          <FieldError message={errors[`${vehicle.id}.engineNumber`]} />
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
          <FieldError message={errors[`${vehicle.id}.chassisNumber`]} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`routes-${vehicle.id}`}>Routes Served</Label>
          <Input
            id={`routes-${vehicle.id}`}
            value={vehicle.routesServed}
            onChange={(e) =>
              onChange(vehicle.id, "routesServed", e.target.value)
            }
            placeholder="e.g. Awka–Onitsha, Awka–Enugu"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of routes (optional)
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
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
          <p className="text-xs text-muted-foreground">
            Date when roadworthiness certificate expires (optional)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SubmitVehiclesPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDetailsEntry[]>([]);

  // Load pending requests on mount
  useEffect(() => {
    (async () => {
      const result = await getPendingVehicleSubmissionRequests();
      if (result.success && result.data) {
        const convertedData = result.data.map((req) => ({
          ...req,
          requestedAt:
            typeof req.requestedAt === "string"
              ? req.requestedAt
              : new Date(req.requestedAt).toISOString(),
        }));
        setPendingRequests(convertedData);
        if (convertedData.length > 0) {
          handleSelectRequest(convertedData[0].id, convertedData[0].vehicleCount);
        }
      } else if (!result.success) {
        setGlobalError(result.error);
      }
      setIsLoading(false);
    })();
  }, []);

  function handleSelectRequest(requestId: string, vehicleCount: number) {
    setSelectedRequest(requestId);
    setVehicles(Array.from({ length: vehicleCount }, () => emptyVehicle()));
    setFieldErrors({});
  }

  function updateVehicle(
    id: string,
    field: keyof VehicleDetailsEntry,
    value: string
  ) {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  }

  function validateVehicles(): boolean {
    const errors: Record<string, string> = {};

    vehicles.forEach((v, idx) => {
      if (!v.registrationNumber.trim()) {
        errors[`${v.id}.registrationNumber`] = "Required";
      }
      if (!v.vehicleType) {
        errors[`${v.id}.vehicleType`] = "Required";
      }
      if (!v.make.trim()) {
        errors[`${v.id}.make`] = "Required";
      }
      if (!v.model.trim()) {
        errors[`${v.id}.model`] = "Required";
      }
      if (!v.engineNumber.trim()) {
        errors[`${v.id}.engineNumber`] = "Required";
      }
      if (!v.chassisNumber.trim()) {
        errors[`${v.id}.chassisNumber`] = "Required";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(undefined);

    if (!selectedRequest) {
      setGlobalError("No vehicle submission request selected");
      return;
    }

    if (!validateVehicles()) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("submissionRequestId", selectedRequest);
      fd.set(
        "vehicles",
        JSON.stringify(
          vehicles.map((v) => ({
            registrationNumber: v.registrationNumber,
            vehicleType: v.vehicleType as VehicleType,
            make: v.make,
            model: v.model,
            engineNumber: v.engineNumber,
            chassisNumber: v.chassisNumber,
            routesServed: v.routesServed || undefined,
            roadworthinessExpiry: v.roadworthinessExpiry || undefined,
          }))
        )
      );

      const result = await submitVehicleDetails(undefined, fd);

      if (result.success) {
        router.push("/fleet-operators?status=SUBMITTED");
      } else {
        setGlobalError(result.error);
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vehicle requests…</p>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            <Link href="/fleet-operators" className="hover:underline">
              Fleet Operators
            </Link>
            {" / "}
            <span>Submit Vehicles</span>
          </nav>
          <h1 className="text-2xl font-semibold">Submit Vehicle Details</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-foreground">No pending requests</p>
                <p className="text-xs">
                  All your vehicle submission requests have been completed.
                </p>
              </div>
            </div>
            <Button asChild className="mt-4">
              <Link href="/fleet-operators">Back to Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentRequest = pendingRequests.find((r) => r.id === selectedRequest);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <span>Submit Vehicles</span>
        </nav>
        <h1 className="text-2xl font-semibold">Submit Vehicle Details</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Provide detailed information for each vehicle in your fleet.
        </p>
      </div>

      {/* Request Selection */}
      {pendingRequests.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => handleSelectRequest(req.id, req.vehicleCount)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border-2 transition-colors",
                    selectedRequest === req.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  )}>
                  <p className="font-medium text-sm">{req.companyName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {req.vehicleCount} vehicles to submit
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Request Summary */}
        {currentRequest && (
          <Card className="bg-accent/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-semibold text-sm">{currentRequest.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicles to Submit</p>
                  <p className="font-semibold text-sm">{currentRequest.vehicleCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="font-semibold text-sm">
                    {vehicles.filter((v) => v.registrationNumber.trim()).length}/
                    {vehicles.length} completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Cards */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Vehicle Details</h2>
            <p className="text-sm text-muted-foreground">
              Enter the required information for each vehicle
            </p>
          </div>

          {vehicles.map((v, i) => (
            <VehicleCard
              key={v.id}
              index={i}
              vehicle={v}
              onChange={updateVehicle}
              errors={fieldErrors}
            />
          ))}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button
            type="submit"
            disabled={isPending || !selectedRequest || vehicles.length === 0}>
            {isPending ? "Submitting…" : "Submit Vehicle Details"}
          </Button>
          <Button asChild variant="outline" disabled={isPending}>
            <Link href="/fleet-operators">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
