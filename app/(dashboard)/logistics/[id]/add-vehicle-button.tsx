"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickerScanModal } from "@/components/mass-transit/attach-sticker-dialog";
import { addLogisticsVehicle, type LogisticsVehicleInput } from "@/app/actions/logistics";

const EMPTY: LogisticsVehicleInput = {
  plateNumber: "",
  vehicleType: "",
  chassisNumber: "",
  make: "",
  model: "",
  color: "",
  stickerNumber: "",
};

export default function AddVehicleButton({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<LogisticsVehicleInput>({ ...EMPTY });
  const [scanning, setScanning] = useState(false);

  const set = <K extends keyof LogisticsVehicleInput>(key: K, value: LogisticsVehicleInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.plateNumber.trim() || !form.vehicleType.trim()) {
      toast.error("Plate number and vehicle type are required.");
      return;
    }
    startTransition(async () => {
      const res = await addLogisticsVehicle(applicantId, form);
      if (res.success) {
        toast.success("Vehicle added.");
        setOpen(false);
        setForm({ ...EMPTY });
        router.refresh();
      } else {
        toast.error(res.error || "Could not add the vehicle.");
      }
    });
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add vehicle
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Plate number</Label>
          <Input value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vehicle type</Label>
          <Input value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Chassis number</Label>
          <Input value={form.chassisNumber} onChange={(e) => set("chassisNumber", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Colour</Label>
          <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Sticker number</Label>
          <div className="flex gap-2">
            <Input
              value={form.stickerNumber}
              onChange={(e) => set("stickerNumber", e.target.value)}
              placeholder="Scan or type the sticker code once attached"
              className="font-mono"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setScanning(true)}>
              <QrCode className="h-4 w-4 mr-1.5" />
              Scan
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "Adding..." : "Add vehicle"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>

      <StickerScanModal
        open={scanning}
        onOpenChange={setScanning}
        onScanSuccess={(code) => set("stickerNumber", code)}
        title="Scan Logistics Vehicle Sticker"
      />
    </div>
  );
}
