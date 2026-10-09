"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickerScanModal } from "@/components/mass-transit/attach-sticker-dialog";
import { updateTowingVan, type TowingVanInput } from "@/app/actions/towing";
import type { TowingVanStatus } from "@prisma/client";

interface TowingVanRecord {
  id: string;
  plateNumber: string;
  chassisNumber: string | null;
  vehicleType: string;
  make: string | null;
  model: string | null;
  color: string | null;
  stickerNumber: string | null;
  operatorName: string;
  operatorPhone: string;
  operatorAddress: string | null;
  operatorGender: string | null;
  hasAssistant: boolean;
  assistantName: string | null;
  assistantPhone: string | null;
  associationMember: boolean;
  associationName: string | null;
  lgaId: string | null;
  status: TowingVanStatus;
  permitNumber: string | null;
}

export default function EditTowingVanClient({
  van,
  lgas,
}: {
  van: TowingVanRecord;
  lgas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<TowingVanInput>({
    plateNumber: van.plateNumber,
    chassisNumber: van.chassisNumber ?? "",
    vehicleType: van.vehicleType,
    make: van.make ?? "",
    model: van.model ?? "",
    color: van.color ?? "",
    stickerNumber: van.stickerNumber ?? "",
    operatorName: van.operatorName,
    operatorPhone: van.operatorPhone,
    operatorAddress: van.operatorAddress ?? "",
    operatorGender: van.operatorGender ?? "",
    hasAssistant: van.hasAssistant,
    assistantName: van.assistantName ?? "",
    assistantPhone: van.assistantPhone ?? "",
    associationMember: van.associationMember,
    associationName: van.associationName ?? "",
    lgaId: van.lgaId ?? "",
  });
  const [scanning, setScanning] = useState(false);

  const set = <K extends keyof TowingVanInput>(key: K, value: TowingVanInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.plateNumber.trim() || !form.vehicleType.trim()) {
      toast.error("Plate number and vehicle type are required.");
      return;
    }
    if (!form.operatorName.trim() || !form.operatorPhone.trim()) {
      toast.error("The operator's name and phone number are required.");
      return;
    }
    startTransition(async () => {
      const res = await updateTowingVan(van.id, form);
      if (res.success) {
        toast.success("Changes saved.");
        router.push(`/towing-vans/${van.id}`);
      } else {
        toast.error(res.error || "Could not save the changes.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link
        href={`/towing-vans/${van.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to towing van
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Towing Van</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Correct any detail entered at registration.
        </p>
      </div>

      {van.status === "PERMIT_ISSUED" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Permit <span className="font-mono font-semibold">{van.permitNumber}</span> has
            already been issued. The printed permit pulls these details live, so
            if you change the plate, vehicle or operator here, reprint the
            document afterwards so it matches.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plateNumber">
              Plate number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="plateNumber"
              value={form.plateNumber}
              onChange={(e) => set("plateNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicleType">
              Vehicle type <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicleType"
              value={form.vehicleType}
              onChange={(e) => set("vehicleType", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chassisNumber">Chassis number</Label>
            <Input
              id="chassisNumber"
              value={form.chassisNumber}
              onChange={(e) => set("chassisNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Colour</Label>
            <Input id="color" value={form.color} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="make">Make</Label>
            <Input id="make" value={form.make} onChange={(e) => set("make", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={form.model} onChange={(e) => set("model", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="stickerNumber">Sticker number</Label>
            <div className="flex gap-2">
              <Input
                id="stickerNumber"
                value={form.stickerNumber}
                onChange={(e) => set("stickerNumber", e.target.value)}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setScanning(true)}>
                <QrCode className="h-4 w-4 mr-1.5" />
                Scan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operator</CardTitle>
          <CardDescription>The registered keeper of this towing van.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="operatorName">
              Operator name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="operatorName"
              value={form.operatorName}
              onChange={(e) => set("operatorName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="operatorPhone">
              Phone number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="operatorPhone"
              value={form.operatorPhone}
              onChange={(e) => set("operatorPhone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="operatorAddress">Address</Label>
            <Input
              id="operatorAddress"
              value={form.operatorAddress}
              onChange={(e) => set("operatorAddress", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="operatorGender">Gender</Label>
            <Input
              id="operatorGender"
              value={form.operatorGender}
              onChange={(e) => set("operatorGender", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lgaId">Area of operation (LGA)</Label>
            <select
              id="lgaId"
              value={form.lgaId}
              onChange={(e) => set("lgaId", e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select LGA</option>
              {lgas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistant</CardTitle>
          <CardDescription>Optional — skip if the operator works alone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.hasAssistant}
              onChange={(e) => set("hasAssistant", e.target.checked)}
            />
            This towing van has an assistant
          </label>
          {form.hasAssistant && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assistantName">Assistant name</Label>
                <Input
                  id="assistantName"
                  value={form.assistantName}
                  onChange={(e) => set("assistantName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assistantPhone">Assistant phone</Label>
                <Input
                  id="assistantPhone"
                  value={form.assistantPhone}
                  onChange={(e) => set("assistantPhone", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Association</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.associationMember}
              onChange={(e) => set("associationMember", e.target.checked)}
            />
            The operator belongs to a towing-van association
          </label>
          {form.associationMember && (
            <div className="space-y-1.5">
              <Label htmlFor="associationName">Association name</Label>
              <Input
                id="associationName"
                value={form.associationName}
                onChange={(e) => set("associationName", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/towing-vans/${van.id}`)}
          disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <StickerScanModal
        open={scanning}
        onOpenChange={setScanning}
        onScanSuccess={(code) => set("stickerNumber", code)}
        title="Scan Towing Van Sticker"
      />
    </div>
  );
}
