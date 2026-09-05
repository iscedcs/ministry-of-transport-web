"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bus, Plus, AlertCircle, Camera, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addVehicleToRevalidation,
  type RevalidationVehicleInput,
} from "@/app/actions/revalidation-triage";
import { StickerScanModal } from "@/components/mass-transit/attach-sticker-dialog";
import type { VehicleType } from "@prisma/client";

interface AddRevalidationVehicleDialogProps {
  applicationId: string;
  companyName: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg";
}

const VEHICLE_TYPE_LABELS: { value: VehicleType; label: string }[] = [
  { value: "BUS", label: "Bus (Commercial)" },
  { value: "MINIBUS", label: "Minibus / Shuttle" },
  { value: "TRUCK", label: "Truck / Haulage" },
  { value: "LIGHT_COMMERCIAL", label: "Light Commercial" },
  { value: "TANKER", label: "Tanker" },
  { value: "PRIVATE_CAR", label: "Saloon Car" },
  { value: "TAXI", label: "Taxi" },
  { value: "RIDE_HAILING", label: "Ride Hailing" },
];

export function AddRevalidationVehicleDialog({
  applicationId,
  companyName,
  buttonVariant = "default",
  buttonSize = "sm",
}: AddRevalidationVehicleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [regNo, setRegNo] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("BUS");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [engineNo, setEngineNo] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [routesServed, setRoutesServed] = useState("");
  const [roadworthinessExpiry, setRoadworthinessExpiry] = useState("");
  const [stickerNo, setStickerNo] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setRegNo("");
    setVehicleType("BUS");
    setMake("");
    setModel("");
    setEngineNo("");
    setChassisNo("");
    setRoutesServed("");
    setRoadworthinessExpiry("");
    setStickerNo("");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regNo.trim()) {
      setError("Registration / plate number is required.");
      return;
    }
    if (!make.trim()) {
      setError("Vehicle make is required.");
      return;
    }
    if (!model.trim()) {
      setError("Vehicle model is required.");
      return;
    }
    if (!engineNo.trim()) {
      setError("Engine number is required.");
      return;
    }
    if (!chassisNo.trim()) {
      setError("Chassis number is required.");
      return;
    }

    startTransition(async () => {
      const payload: RevalidationVehicleInput = {
        registrationNumber: regNo.trim().toUpperCase(),
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        engineNumber: engineNo.trim().toUpperCase(),
        chassisNumber: chassisNo.trim().toUpperCase(),
        routesServed: routesServed.trim() || undefined,
        roadworthinessExpiry: roadworthinessExpiry || undefined,
        stickerNumber: stickerNo.trim() || undefined,
      };

      const res = await addVehicleToRevalidation(applicationId, payload);
      if (!res.success) {
        setError(res.error || "Failed to add vehicle.");
        toast.error(res.error || "Failed to add vehicle.");
        return;
      }

      toast.success(`Vehicle ${payload.registrationNumber} added to fleet!`);
      resetForm();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="gap-1.5 cursor-pointer font-semibold shadow-xs">
        <Plus className="w-4 h-4" />
        <span>Add Fleet Vehicle</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border text-foreground p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Add Vehicle to Mass Transit Fleet
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Onboard a new vehicle for <strong>{companyName}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Plate Number */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">
                  Plate / Registration Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                  placeholder="e.g. AWK-123-XA"
                  className="font-mono uppercase font-bold text-xs"
                  required
                />
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Vehicle Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={vehicleType}
                  onValueChange={(val) => setVehicleType(val as VehicleType)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPE_LABELS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Make */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Make / Manufacturer{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="e.g. Toyota, Mercedes"
                  className="text-xs"
                  required
                />
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Model <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Hiace, Sprinter 515"
                  className="text-xs"
                  required
                />
              </div>

              {/* Roadworthiness Expiry */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Roadworthiness Expiry (Optional)
                </Label>
                <Input
                  type="date"
                  value={roadworthinessExpiry}
                  onChange={(e) => setRoadworthinessExpiry(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Engine Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Engine Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={engineNo}
                  onChange={(e) => setEngineNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 2TR-FE-7890123"
                  className="font-mono uppercase text-xs"
                  required
                />
              </div>

              {/* Chassis Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Chassis Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={chassisNo}
                  onChange={(e) => setChassisNo(e.target.value.toUpperCase())}
                  placeholder="e.g. JTF2TR90234567890"
                  className="font-mono uppercase text-xs"
                  required
                />
              </div>

              {/* Routes Served */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">
                  Designated Routes Served (Optional)
                </Label>
                <Input
                  value={routesServed}
                  onChange={(e) => setRoutesServed(e.target.value)}
                  placeholder="e.g. Onitsha - Awka - Ekwulobia"
                  className="text-xs"
                />
              </div>

              {/* Physical QR Sticker */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-primary" />
                    Physical QR Sticker Number (Optional)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsScannerOpen(true)}
                    className="h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </Button>
                </div>
                <Input
                  value={stickerNo}
                  onChange={(e) => setStickerNo(e.target.value.toUpperCase())}
                  placeholder="e.g. MOT-STK-2026-XXXX or scan QR code"
                  className="font-mono uppercase text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Scan or type the physical QR sticker code to attach it during vehicle creation.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-xl text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs cursor-pointer shadow-xs">
                {isPending ? "Adding Vehicle..." : "Confirm & Add Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <StickerScanModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={(code) => setStickerNo(code)}
      />
    </>
  );
}
