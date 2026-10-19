"use client";

/**
 * Logistics vehicle detail — click a vehicle row on the applicant detail page
 * to see everything recorded for it. Read-only for now; there is no vehicle
 * edit action yet (the applicant-level edit action does not touch vehicles).
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RowGrid as Row } from "@/components/ui/row";
import { fmtDateShort as fmt } from "@/lib/utils/format";

export interface LogisticsVehicleSummary {
  id: string;
  plateNumber: string;
  vehicleType: string;
  chassisNumber: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  stickerNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function VehicleDetailDialog({
  vehicle,
}: {
  vehicle: LogisticsVehicleSummary;
}) {
  const [open, setOpen] = useState(false);

  const meta = [
    vehicle.vehicleType,
    [vehicle.make, vehicle.model].filter(Boolean).join(" ") || null,
    vehicle.color,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View vehicle details"
        className="group cursor-pointer text-left">
        <p className="font-mono font-semibold group-hover:underline">
          {vehicle.plateNumber}
        </p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">
              {vehicle.plateNumber}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Row label="Vehicle Type" value={vehicle.vehicleType} />
            <Row label="Make" value={vehicle.make} />
            <Row label="Model" value={vehicle.model} />
            <Row label="Colour" value={vehicle.color} />
            <Row label="Chassis Number" value={vehicle.chassisNumber} />
            <Row label="Sticker Number" value={vehicle.stickerNumber} />
            <Row label="Registered" value={fmt(vehicle.createdAt)} />
            <Row label="Last Updated" value={fmt(vehicle.updatedAt)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
