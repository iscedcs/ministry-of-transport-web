"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bus,
  FileText,
  Pencil,
  QrCode,
  ExternalLink,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTracasVehicle } from "@/app/actions/tracas";
import { canEditFleet } from "@/lib/fleet-roles";

interface VehicleDetail {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  authorityRef: string;
  category: string;
  capacity: number | null;
  makeModel: string | null;
  engineNumber: string | null;
  chassisNumber: string | null;
  insuranceCertificateNo: string | null;
  insuranceCommencement: Date | null;
  insuranceExpiry: Date | null;
  particularsIssueDate: Date | null;
  particularsExpiryDate: Date | null;
  assignedRoute: string | null;
  ownershipType: string;
  enrollmentType: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  ownerNIN: string | null;
  status: string;
  letterStatus: string;
  mdApprovedAt: Date | null;
  commissionerApprovedAt: Date | null;
  declinedAtStage: string | null;
  declineReason: string | null;
  authorityIssueDate: Date | null;
  createdAt: Date;
  assignedDriver: {
    id: string;
    fullName: string;
    phoneNumber: string;
    licenseNumber: string | null;
    photoUrl: string | null;
  } | null;
  sticker: { id: string; stickerCode: string | null; stickerUrl: string } | null;
}

const fmt = (d: Date | string | null) =>
  d ? format(new Date(d), "dd MMM yyyy") : "—";

const asDateInput = (d: Date | string | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

const OWNERSHIP_LABEL: Record<string, string> = {
  GOVERNMENT_OWNED: "State Fleet",
  INDIVIDUAL: "Private Owner",
  COLLABORATIVE: "Franchise",
};

const CATEGORY_OPTIONS = [
  { value: "BUS", label: "Bus" },
  { value: "SHUTTLE_BUS", label: "Shuttle Bus" },
  { value: "CAR", label: "Car" },
  { value: "TRICYCLE", label: "Tricycle (Keke)" },
];

const LETTER_LABEL: Record<string, string> = {
  PENDING_MD_APPROVAL: "Awaiting MD",
  PENDING_COMMISSIONER_APPROVAL: "Awaiting Commissioner",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm text-foreground mt-0.5 break-words">
        {value || "—"}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {children}
        </dl>
      </CardContent>
    </Card>
  );
}

export function VehicleDetailClient({
  vehicle,
  currentUserRole,
}: {
  vehicle: VehicleDetail;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const canEdit = canEditFleet(currentUserRole);

  const [form, setForm] = useState({
    registrationNumber: vehicle.registrationNumber,
    category: vehicle.category,
    capacity: vehicle.capacity?.toString() ?? "",
    makeModel: vehicle.makeModel ?? "",
    engineNumber: vehicle.engineNumber ?? "",
    chassisNumber: vehicle.chassisNumber ?? "",
    insuranceCertificateNo: vehicle.insuranceCertificateNo ?? "",
    insuranceCommencement: asDateInput(vehicle.insuranceCommencement),
    insuranceExpiry: asDateInput(vehicle.insuranceExpiry),
    particularsIssueDate: asDateInput(vehicle.particularsIssueDate),
    particularsExpiryDate: asDateInput(vehicle.particularsExpiryDate),
    assignedRoute: vehicle.assignedRoute ?? "",
    ownershipType: vehicle.ownershipType,
    enrollmentType: vehicle.enrollmentType,
    ownerName: vehicle.ownerName ?? "",
    ownerPhone: vehicle.ownerPhone ?? "",
    ownerAddress: vehicle.ownerAddress ?? "",
    ownerNIN: vehicle.ownerNIN ?? "",
    status: vehicle.status,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateTracasVehicle(vehicle.id, form);
      if (res.success) {
        toast.success("Vehicle updated.");
        setIsEditOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update the vehicle.");
      }
    });
  };

  const isApproved = vehicle.letterStatus === "APPROVED";

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/tracas"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to fleet register
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">
              {vehicle.registrationNumber}
            </h1>
            <Badge variant="outline" className="font-mono">
              {vehicle.fleetNumber}
            </Badge>
            <Badge
              className={
                vehicle.enrollmentType === "NEW_JOINER"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold text-[10px]"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20 font-bold text-[10px]"
              }>
              {vehicle.enrollmentType === "NEW_JOINER"
                ? "New Joiner"
                : "Existing"}
            </Badge>
            <Badge
              className={
                isApproved
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]"
                  : vehicle.letterStatus === "DECLINED"
                    ? "bg-red-500/10 text-red-500 border-red-500/20 font-bold text-[10px]"
                    : "bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold text-[10px]"
              }>
              {LETTER_LABEL[vehicle.letterStatus] ?? vehicle.letterStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {vehicle.authorityRef}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/tracas/${vehicle.id}/letter`}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg hover:bg-secondary/70 transition-colors">
            <FileText className="w-3.5 h-3.5" />
            Letter of Authority
          </Link>
          <Link
            href={`/verify/tracas/${vehicle.authorityRef}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg hover:bg-secondary/70 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Public view
          </Link>
          {canEdit && (
            <Button
              onClick={() => setIsEditOpen(true)}
              className="gap-1.5 cursor-pointer">
              <Pencil className="w-3.5 h-3.5" />
              Edit vehicle
            </Button>
          )}
        </div>
      </div>

      {vehicle.letterStatus === "DECLINED" && vehicle.declineReason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-500">
              Declined at {vehicle.declinedAtStage ?? "review"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicle.declineReason}
            </p>
          </div>
        </div>
      )}

      <Section title="Vehicle">
        <Field label="Registration" value={vehicle.registrationNumber} />
        <Field label="Fleet Number" value={vehicle.fleetNumber} />
        <Field label="Category" value={vehicle.category} />
        <Field
          label="Capacity"
          value={vehicle.capacity ? `${vehicle.capacity} seats` : "—"}
        />
        <Field label="Make & Model" value={vehicle.makeModel} />
        <Field label="Engine No." value={vehicle.engineNumber} />
        <Field label="Chassis / VIN" value={vehicle.chassisNumber} />
        <Field label="Assigned Route" value={vehicle.assignedRoute} />
        <Field label="Status" value={vehicle.status} />
      </Section>

      <Section title="Ownership & Enrolment">
        <Field
          label="Ownership"
          value={OWNERSHIP_LABEL[vehicle.ownershipType] ?? vehicle.ownershipType}
        />
        <Field
          label="Enrolment"
          value={
            vehicle.enrollmentType === "NEW_JOINER"
              ? "Joining Company (New)"
              : "Existing in Company"
          }
        />
        <Field label="Owner Name" value={vehicle.ownerName} />
        <Field label="Owner Phone" value={vehicle.ownerPhone} />
        <Field label="Owner NIN" value={vehicle.ownerNIN} />
        <Field label="Owner Address" value={vehicle.ownerAddress} />
      </Section>

      <Section title="Particulars & Insurance">
        <Field
          label="Particulars Issued"
          value={fmt(vehicle.particularsIssueDate)}
        />
        <Field
          label="Particulars Expiry"
          value={fmt(vehicle.particularsExpiryDate)}
        />
        <Field
          label="Insurance Certificate"
          value={vehicle.insuranceCertificateNo}
        />
        <Field
          label="Insurance From"
          value={fmt(vehicle.insuranceCommencement)}
        />
        <Field label="Insurance To" value={fmt(vehicle.insuranceExpiry)} />
        <Field label="Authority Issued" value={fmt(vehicle.authorityIssueDate)} />
      </Section>

      {/* Driver and sticker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Assigned Driver
            </h2>
            {vehicle.assignedDriver ? (
              <Link
                href={`/tracas/driver/${vehicle.assignedDriver.id}/id-card`}
                className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  {vehicle.assignedDriver.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vehicle.assignedDriver.photoUrl}
                      alt={vehicle.assignedDriver.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                      {vehicle.assignedDriver.fullName[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {vehicle.assignedDriver.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.assignedDriver.phoneNumber}
                    {vehicle.assignedDriver.licenseNumber
                      ? ` · ${vehicle.assignedDriver.licenseNumber}`
                      : ""}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No driver assigned.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-muted-foreground" />
              Physical Sticker
            </h2>
            {vehicle.sticker ? (
              <div className="min-w-0">
                <p className="font-mono font-semibold text-foreground break-all">
                  {vehicle.sticker.stickerCode ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground break-all mt-0.5">
                  {vehicle.sticker.stickerUrl}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sticker bound. The vehicle cannot be verified by public scan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval chain */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bus className="w-4 h-4 text-muted-foreground" />
            Letter Approval
          </h2>
          <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field
              label="Stage"
              value={LETTER_LABEL[vehicle.letterStatus] ?? vehicle.letterStatus}
            />
            <Field label="MD Approved" value={fmt(vehicle.mdApprovedAt)} />
            <Field
              label="Commissioner Approved"
              value={fmt(vehicle.commissionerApprovedAt)}
            />
          </dl>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Vehicle
            </DialogTitle>
            <DialogDescription>
              {vehicle.registrationNumber} ({vehicle.fleetNumber})
            </DialogDescription>
          </DialogHeader>

          {isApproved && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                This vehicle&apos;s Letter of Authority is already approved and
                may be in circulation. Changes here alter what the letter shows.
              </p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="registrationNumber">Registration *</Label>
                <Input
                  id="registrationNumber"
                  value={form.registrationNumber}
                  onChange={(e) =>
                    setForm({ ...form, registrationNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fleet Number</Label>
                <Input value={vehicle.fleetNumber} disabled />
                <p className="text-[11px] text-muted-foreground">
                  Positional across the register — changed only by migration.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enrollmentType">Enrolment Status *</Label>
                <Select
                  value={form.enrollmentType}
                  onValueChange={(v) => setForm({ ...form, enrollmentType: v })}>
                  <SelectTrigger id="enrollmentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXISTING">
                      Existing in Company
                    </SelectItem>
                    <SelectItem value="NEW_JOINER">
                      Joining Company (New)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ownershipType">Ownership Type *</Label>
                <Select
                  value={form.ownershipType}
                  onValueChange={(v) => setForm({ ...form, ownershipType: v })}>
                  <SelectTrigger id="ownershipType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOVERNMENT_OWNED">
                      Government Owned (State Fleet)
                    </SelectItem>
                    <SelectItem value="INDIVIDUAL">
                      Individual / Private Owner
                    </SelectItem>
                    <SelectItem value="COLLABORATIVE">
                      Collaborative / Franchise
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Changing this does not renumber the fleet number.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                    {/* Vehicles onboarded with a free-text category keep it
                        selectable instead of being silently reassigned. */}
                    {!CATEGORY_OPTIONS.some((c) => c.value === form.category) &&
                      form.category && (
                        <SelectItem value={form.category}>
                          {form.category}
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity">Capacity (seats)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={200}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="makeModel">Make &amp; Model</Label>
                <Input
                  id="makeModel"
                  value={form.makeModel}
                  onChange={(e) =>
                    setForm({ ...form, makeModel: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="engineNumber">Engine Number</Label>
                <Input
                  id="engineNumber"
                  value={form.engineNumber}
                  onChange={(e) =>
                    setForm({ ...form, engineNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chassisNumber">Chassis / VIN</Label>
                <Input
                  id="chassisNumber"
                  value={form.chassisNumber}
                  onChange={(e) =>
                    setForm({ ...form, chassisNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assignedRoute">Assigned Route</Label>
                <Input
                  id="assignedRoute"
                  value={form.assignedRoute}
                  onChange={(e) =>
                    setForm({ ...form, assignedRoute: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="particularsIssueDate">
                  Particulars Issue Date *
                </Label>
                <Input
                  id="particularsIssueDate"
                  type="date"
                  value={form.particularsIssueDate}
                  onChange={(e) =>
                    setForm({ ...form, particularsIssueDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="particularsExpiryDate">
                  Particulars Expiry Date *
                </Label>
                <Input
                  id="particularsExpiryDate"
                  type="date"
                  value={form.particularsExpiryDate}
                  onChange={(e) =>
                    setForm({ ...form, particularsExpiryDate: e.target.value })
                  }
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Drives the expiry printed on the Letter of Authority.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceCertificateNo">
                  Insurance Certificate No.
                </Label>
                <Input
                  id="insuranceCertificateNo"
                  value={form.insuranceCertificateNo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      insuranceCertificateNo: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceCommencement">Insurance From</Label>
                <Input
                  id="insuranceCommencement"
                  type="date"
                  value={form.insuranceCommencement}
                  onChange={(e) =>
                    setForm({ ...form, insuranceCommencement: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceExpiry">Insurance To</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(e) =>
                    setForm({ ...form, insuranceExpiry: e.target.value })
                  }
                />
              </div>
            </div>

            {form.ownershipType !== "GOVERNMENT_OWNED" && (
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">
                  Vehicle Owner Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerName">Owner Name</Label>
                    <Input
                      id="ownerName"
                      value={form.ownerName}
                      onChange={(e) =>
                        setForm({ ...form, ownerName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerPhone">Owner Phone</Label>
                    <Input
                      id="ownerPhone"
                      value={form.ownerPhone}
                      onChange={(e) =>
                        setForm({ ...form, ownerPhone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerNIN">Owner NIN</Label>
                    <Input
                      id="ownerNIN"
                      value={form.ownerNIN}
                      onChange={(e) =>
                        setForm({ ...form, ownerNIN: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerAddress">Owner Address</Label>
                    <Input
                      id="ownerAddress"
                      value={form.ownerAddress}
                      onChange={(e) =>
                        setForm({ ...form, ownerAddress: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="cursor-pointer">
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
