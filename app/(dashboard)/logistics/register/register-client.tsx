"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickerScanModal } from "@/components/mass-transit/attach-sticker-dialog";
import {
  registerLogisticsApplicant,
  type LogisticsApplicantInput,
  type LogisticsVehicleInput,
} from "@/app/actions/logistics";
import type { LogisticsApplicantType } from "@prisma/client";

const EMPTY_VEHICLE: LogisticsVehicleInput = {
  plateNumber: "",
  vehicleType: "",
  chassisNumber: "",
  make: "",
  model: "",
  color: "",
  stickerNumber: "",
};

export default function RegisterLogisticsClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [applicantType, setApplicantType] = useState<LogisticsApplicantType>("COMPANY");
  const [companyName, setCompanyName] = useState("");
  const [cacNumber, setCacNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [vehicles, setVehicles] = useState<LogisticsVehicleInput[]>([{ ...EMPTY_VEHICLE }]);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);

  const setVehicle = (i: number, patch: Partial<LogisticsVehicleInput>) =>
    setVehicles((v) => v.map((x, j) => (i === j ? { ...x, ...patch } : x)));

  const addVehicle = () => setVehicles((v) => [...v, { ...EMPTY_VEHICLE }]);
  const removeVehicle = (i: number) => setVehicles((v) => v.filter((_, j) => j !== i));

  const submit = () => {
    if (applicantType === "COMPANY" && !companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    if (!contactPerson.trim() || !contactPhone.trim()) {
      toast.error("Contact name and phone number are required.");
      return;
    }
    for (const v of vehicles) {
      if (!v.plateNumber.trim() || !v.vehicleType.trim()) {
        toast.error("Every vehicle needs a plate number and a vehicle type.");
        return;
      }
    }

    const input: LogisticsApplicantInput = {
      applicantType,
      companyName: applicantType === "COMPANY" ? companyName : undefined,
      cacNumber: applicantType === "COMPANY" ? cacNumber : undefined,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      vehicles,
    };

    startTransition(async () => {
      const res = await registerLogisticsApplicant(input);
      if (res.success) {
        toast.success("Registered.");
        router.push(`/logistics/${res.applicantId}`);
      } else {
        toast.error(res.error || "Could not register.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link
        href="/logistics"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Logistics
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Register Logistics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vehicles used for delivery or courier services — tricycle, keke, bus, van, truck
          or lorry. Bikes are excluded.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applicant type</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          {(["COMPANY", "INDIVIDUAL"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setApplicantType(t);
                if (t === "INDIVIDUAL" && vehicles.length > 1) {
                  setVehicles([vehicles[0]]);
                }
              }}
              className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                applicantType === t
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}>
              <p className="font-semibold">{t === "COMPANY" ? "Company" : "Individual"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t === "COMPANY"
                  ? "A business with one or more logistics vehicles"
                  : "A single operator with their own vehicle"}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {applicantType === "COMPANY" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="companyName">
                Company name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cacNumber">CAC number</Label>
              <Input id="cacNumber" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>
            {applicantType === "COMPANY"
              ? "The company's contact person."
              : "The individual operator."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactPerson">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Vehicle{applicantType === "COMPANY" ? "s" : ""}
            </CardTitle>
            <CardDescription>
              {applicantType === "COMPANY"
                ? "Every vehicle owned by this company."
                : "The operator's own vehicle."}
            </CardDescription>
          </div>
          {applicantType === "COMPANY" && (
            <Button type="button" size="sm" variant="outline" onClick={addVehicle} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add vehicle
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {vehicles.map((v, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              {applicantType === "COMPANY" && (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vehicle {i + 1}
                  </p>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVehicle(i)}
                      className="text-xs text-destructive hover:underline">
                      <Trash2 className="inline h-3 w-3 mr-1" />
                      Remove
                    </button>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Plate number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={v.plateNumber}
                    onChange={(e) => setVehicle(i, { plateNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Vehicle type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={v.vehicleType}
                    onChange={(e) => setVehicle(i, { vehicleType: e.target.value })}
                    placeholder="Tricycle, keke, bus, van, truck, lorry..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chassis number</Label>
                  <Input
                    value={v.chassisNumber}
                    onChange={(e) => setVehicle(i, { chassisNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Input value={v.color} onChange={(e) => setVehicle(i, { color: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input value={v.make} onChange={(e) => setVehicle(i, { make: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={v.model} onChange={(e) => setVehicle(i, { model: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Sticker number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={v.stickerNumber}
                      onChange={(e) => setVehicle(i, { stickerNumber: e.target.value })}
                      placeholder="Scan or type the sticker code once attached"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setScanningIndex(i)}>
                      <QrCode className="h-4 w-4 mr-1.5" />
                      Scan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push("/logistics")} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Registering..." : "Register"}
        </Button>
      </div>

      <StickerScanModal
        open={scanningIndex !== null}
        onOpenChange={(open) => !open && setScanningIndex(null)}
        onScanSuccess={(code) => {
          if (scanningIndex !== null) setVehicle(scanningIndex, { stickerNumber: code });
        }}
        title="Scan Logistics Vehicle Sticker"
      />
    </div>
  );
}
