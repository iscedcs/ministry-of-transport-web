/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Bus,
  Plus,
  QrCode,
  UserCheck,
  UserPlus,
  Pencil,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Tag,
  FileText,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  Printer,
  Upload,
  X,
  Camera,
  IdCard,
} from "lucide-react";

import {
  onboardTracasVehicle,
  onboardTracasDriver,
  reassignTracasDriver,
  updateTracasDriver,
  assignStickerToTracasVehicle,
  addStickerUrlsToTracasPool,
} from "@/app/actions/tracas";
import { StickerQrScannerModal } from "@/components/tracas/sticker-qr-scanner-modal";
import { canWriteFleet } from "@/lib/fleet-roles";

interface VehicleItem {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  category: string;
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
  joinedCompanyAt: Date | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  ownerNIN: string | null;
  authorityRef: string;

  authorityIssueDate: Date | null;
  authorityExpiryDate: Date | null;
  status: string;
  assignedDriverId: string | null;
  assignedDriver: {
    id: string;
    fullName: string;
    phoneNumber: string;
    photoUrl: string | null;
    licenseNumber: string | null;
  } | null;
  sticker: {
    id: string;
    stickerUrl: string;
    stickerCode: string | null;
  } | null;
  createdAt: Date;
}

interface DriverItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  securityCode?: string | null;
  email: string | null;
  photoUrl: string | null;
  nin: string | null;
  asinNumber: string | null;
  residentialAddress: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  licenseNumber: string | null;
  licenseIssueDate: Date | null;
  licenseExpiryDate: Date | null;
  status: string;
  vehicles?: { id: string; registrationNumber: string; fleetNumber: string }[];
}

interface StickerItem {
  id: string;
  stickerUrl: string;
  stickerCode: string | null;
  isAssigned: boolean;
  assignedVehicleId: string | null;
  assignedVehicle?: {
    id: string;
    registrationNumber: string;
    fleetNumber: string;
  } | null;
}

interface TracasClientProps {
  initialVehicles: VehicleItem[];
  initialDrivers: DriverItem[];
  initialStickers: StickerItem[];
  currentUserRole: string | null;
}

export default function TracasClient({
  initialVehicles,
  initialDrivers,
  initialStickers,
  currentUserRole,
}: TracasClientProps) {
  /** Sticker inventory loading is System Admin only. */
  const isSystemAdmin = currentUserRole === "SYSTEM_ADMIN";
  /** Changing or removing an existing driver stays System Admin only. */
  const canReassignDriver = isSystemAdmin;
  /**
   * Creating or modifying fleet records is the Enumerator's job. Everyone
   * else with TRACAS visibility — PS, the HODs, the MD, inspectors — is
   * read-only, so no write control is rendered for them at all.
   */
  const canWrite = canWriteFleet(currentUserRole);
  /** Attaching a driver to a vehicle that has none is part of onboarding. */
  const canAssignDriver = canWrite;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "vehicles" | "drivers" | "stickers"
  >("vehicles");
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollmentFilter, setEnrollmentFilter] = useState<
    "ALL" | "EXISTING" | "NEW_JOINER"
  >("ALL");

  // Modals
  const [isOnboardVehicleOpen, setIsOnboardVehicleOpen] = useState(false);
  const [isOnboardDriverOpen, setIsOnboardDriverOpen] = useState(false);
  const [isReassignDriverOpen, setIsReassignDriverOpen] = useState(false);
  const [isAssignStickerOpen, setIsAssignStickerOpen] = useState(false);
  const [isReplaceStickerConfirmOpen, setIsReplaceStickerConfirmOpen] =
    useState(false);
  const [isAddStickersOpen, setIsAddStickersOpen] = useState(false);

  // Selected Target Objects for Modals
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(
    null,
  );

  // Form States
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: "",
    fleetNumber: "",
    category: "BUS",
    customType: "",
    ownershipType: "GOVERNMENT_OWNED",
    enrollmentType: "EXISTING",
    ownerName: "",
    ownerPhone: "",
    ownerAddress: "",
    ownerNIN: "",
    makeModel: "",
    engineNumber: "",
    chassisNumber: "",
    insuranceCertificateNo: "",
    insuranceCommencement: "",
    insuranceExpiry: "",
    particularsIssueDate: "",
    particularsExpiryDate: "",
    assignedRoute: "",
    assignedDriverId: "",
    stickerId: "",
  });

  const [driverForm, setDriverForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    photoUrl: "",
    nin: "",
    asinNumber: "",
    residentialAddress: "",
    stateOfOrigin: "",
    lga: "",
    dateOfBirth: "",
    gender: "MALE",
    bloodGroup: "",
    maritalStatus: "",
    educationalQualification: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    guarantorName: "",
    guarantorPhone: "",
    guarantorAddress: "",
    licenseNumber: "",
    licenseIssueDate: "",
    licenseExpiryDate: "",
    operatorAssociation: "",
    notes: "",
  });

  const [reassignForm, setReassignForm] = useState({
    vehicleId: "",
    driverId: "NONE",
  });

  const [assignStickerForm, setAssignStickerForm] = useState({
    vehicleId: "",
    stickerId: "NONE",
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetVehicle, setScannerTargetVehicle] = useState<VehicleItem | null>(null);

  const [batchStickerUrls, setBatchStickerUrls] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScannerSuccess = async (scannedCodeOrUrl: string) => {
    const targetVehicle = scannerTargetVehicle || selectedVehicle;
    if (!targetVehicle) {
      toast.error("No vehicle selected for sticker binding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assignStickerToTracasVehicle(targetVehicle.id, scannedCodeOrUrl);
      if (res.success) {
        toast.success(`Sticker bound successfully to vehicle ${targetVehicle.registrationNumber}!`);
        setIsAssignStickerOpen(false);
        setIsScannerOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to bind sticker.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Driver profile editing (System Admin only) ──
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);
  const [editDriverForm, setEditDriverForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    photoUrl: "",
    nin: "",
    asinNumber: "",
    residentialAddress: "",
    stateOfOrigin: "",
    lga: "",
    licenseNumber: "",
    licenseIssueDate: "",
    licenseExpiryDate: "",
    operatorAssociation: "",
    status: "ACTIVE",
  });

  const asDateInput = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  };

  const openEditDriver = (driver: DriverItem) => {
    setEditingDriver(driver);
    setEditDriverForm({
      fullName: driver.fullName ?? "",
      phoneNumber: driver.phoneNumber ?? "",
      email: driver.email ?? "",
      photoUrl: driver.photoUrl ?? "",
      nin: driver.nin ?? "",
      asinNumber: driver.asinNumber ?? "",
      residentialAddress: driver.residentialAddress ?? "",
      stateOfOrigin: driver.stateOfOrigin ?? "",
      lga: driver.lga ?? "",
      licenseNumber: driver.licenseNumber ?? "",
      licenseIssueDate: asDateInput(driver.licenseIssueDate),
      licenseExpiryDate: asDateInput(driver.licenseExpiryDate),
      operatorAssociation: "",
      status: driver.status ?? "ACTIVE",
    });
    setIsEditDriverOpen(true);
  };

  /** Photo replacement inside the edit modal, same 5 MB / image-only rule. */
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditDriverForm((prev) => ({ ...prev, photoUrl: result }));
        toast.success("New passport photograph loaded.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setIsSubmitting(true);
    try {
      const res = await updateTracasDriver(editingDriver.id, editDriverForm);
      if (res.success) {
        toast.success("Driver profile updated.");
        setIsEditDriverOpen(false);
        setEditingDriver(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update driver.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDriverForm((prev) => ({ ...prev, photoUrl: result }));
        toast.success("Passport photograph loaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtered lists

  const availableStickers = initialStickers.filter((s) => !s.isAssigned);

  const newJoinerCount = initialVehicles.filter(
    (v) => v.enrollmentType === "NEW_JOINER",
  ).length;

  /**
   * Drivers with no vehicle attached. A driver may only operate one vehicle,
   * so anyone already holding one is not offered for a new assignment.
   */
  const availableDrivers = initialDrivers.filter(
    (d) => !d.vehicles || d.vehicles.length === 0,
  );

  /**
   * Options for the reassign modal: the unassigned pool, plus whichever
   * driver currently holds THIS vehicle so the active selection still renders.
   */
  const vehicleCurrentDriverId =
    initialVehicles.find((v) => v.id === reassignForm.vehicleId)
      ?.assignedDriverId ?? null;

  const reassignDriverOptions = (() => {
    const current = initialDrivers.find(
      (d) => d.id === vehicleCurrentDriverId,
    );
    if (!current || availableDrivers.some((d) => d.id === current.id)) {
      return availableDrivers;
    }
    return [current, ...availableDrivers];
  })();

  const filteredVehicles = initialVehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      v.registrationNumber.toLowerCase().includes(q) ||
      v.fleetNumber.toLowerCase().includes(q) ||
      v.authorityRef.toLowerCase().includes(q) ||
      Boolean(v.assignedDriver?.fullName.toLowerCase().includes(q));

    // Legacy rows written before enrollmentType existed read as EXISTING.
    const enrollment =
      v.enrollmentType === "NEW_JOINER" ? "NEW_JOINER" : "EXISTING";
    const matchesEnrollment =
      enrollmentFilter === "ALL" || enrollment === enrollmentFilter;

    return matchesSearch && matchesEnrollment;
  });

  const filteredDrivers = initialDrivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phoneNumber.includes(searchQuery) ||
      (d.licenseNumber &&
        d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredStickers = initialStickers.filter(
    (s) =>
      s.stickerUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.stickerCode &&
        s.stickerCode.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Submit Vehicle Form
  const handleOnboardVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalCategory = vehicleForm.customType.trim()
        ? vehicleForm.customType.trim()
        : vehicleForm.category;

      const res = await onboardTracasVehicle({
        ...vehicleForm,
        category: finalCategory,
        assignedDriverId:
          vehicleForm.assignedDriverId === "NONE"
            ? undefined
            : vehicleForm.assignedDriverId,
        stickerId:
          vehicleForm.stickerId === "NONE" ? undefined : vehicleForm.stickerId,
      });

      if (res.success) {
        toast.success("TRACAS vehicle onboarded successfully!");
        setIsOnboardVehicleOpen(false);
        setVehicleForm({
          registrationNumber: "",
          fleetNumber: "",
          category: "BUS",
          customType: "",
          ownershipType: "GOVERNMENT_OWNED",
          enrollmentType: "EXISTING",
          ownerName: "",
          ownerPhone: "",
          ownerAddress: "",
          ownerNIN: "",
          makeModel: "",
          engineNumber: "",
          chassisNumber: "",
          insuranceCertificateNo: "",
          insuranceCommencement: "",
          insuranceExpiry: "",
          particularsIssueDate: "",
          particularsExpiryDate: "",
          assignedRoute: "",
          assignedDriverId: "",
          stickerId: "",
        });

        router.refresh();
      } else {
        toast.error(res.error || "Failed to onboard vehicle.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Driver Bio-Data Form
  const handleOnboardDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onboardTracasDriver(driverForm);
      if (res.success) {
        toast.success("TRACAS driver bio-data enumerated & saved!");
        setIsOnboardDriverOpen(false);
        setDriverForm({
          fullName: "",
          phoneNumber: "",
          email: "",
          photoUrl: "",
          nin: "",
          asinNumber: "",
          residentialAddress: "",
          stateOfOrigin: "",
          lga: "",
          dateOfBirth: "",
          gender: "MALE",
          bloodGroup: "",
          maritalStatus: "",
          educationalQualification: "",
          nextOfKinName: "",
          nextOfKinPhone: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
          guarantorName: "",
          guarantorPhone: "",
          guarantorAddress: "",
          licenseNumber: "",
          licenseIssueDate: "",
          licenseExpiryDate: "",
          operatorAssociation: "",
          notes: "",
        });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to onboard driver.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reassign Driver
  const handleReassignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignForm.vehicleId) return;
    setIsSubmitting(true);
    try {
      const driverId =
        reassignForm.driverId === "NONE" ? null : reassignForm.driverId;
      const res = await reassignTracasDriver(reassignForm.vehicleId, driverId);
      if (res.success) {
        toast.success("Driver assignment updated!");
        setIsReassignDriverOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reassign driver.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Assign Sticker
  const handleAssignSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStickerForm.vehicleId) return;
    setIsSubmitting(true);
    try {
      const stickerId =
        assignStickerForm.stickerId === "NONE"
          ? null
          : assignStickerForm.stickerId;
      const res = await assignStickerToTracasVehicle(
        assignStickerForm.vehicleId,
        stickerId,
      );
      if (res.success) {
        toast.success("Vehicle sticker binding updated!");
        setIsAssignStickerOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update sticker.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Pre-load Stickers
  const handleAddStickers = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = batchStickerUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      toast.error("Please enter at least one sticker URL.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addStickerUrlsToTracasPool(urls);
      if (res.success) {
        toast.success(`Successfully pre-loaded ${res.count} stickers!`);
        setIsAddStickersOpen(false);
        setBatchStickerUrls("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to pre-load stickers.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1
            className="text-2xl font-bold text-foreground flex items-center gap-2.5"
            style={{ fontFamily: "var(--font-display)" }}>
            <Bus className="w-7 h-7 text-primary" />
            TRACAS Transport Fleet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transport Company of Anambra State · Vehicle & Driver Enumeration,
            Fleet QR Stickers & Official Letter of Authority Generator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSystemAdmin && (
            <Button
              variant="outline"
              onClick={() => setIsAddStickersOpen(true)}
              className="gap-2 cursor-pointer">
              <Tag className="w-4 h-4 text-primary" />
              Pre-Load QR Stickers
            </Button>
          )}

          {canWrite && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsOnboardDriverOpen(true)}
                className="gap-2 cursor-pointer">
                <UserPlus className="w-4 h-4 text-primary" />
                Enumerate Driver
              </Button>

              <Button
                onClick={() => setIsOnboardVehicleOpen(true)}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer font-semibold">
                <Plus className="w-4 h-4" />
                Onboard Vehicle
              </Button>
            </>
          )}

          {!canWrite && (
            <span className="text-xs text-muted-foreground font-medium px-3 py-2 rounded-lg bg-secondary">
              View-only access
            </span>
          )}
        </div>
      </div>

      {/* Fleet Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Fleet Vehicles
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {initialVehicles.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {initialVehicles.length - newJoinerCount} existing ·{" "}
                <span className="text-amber-500 font-bold">
                  {newJoinerCount} new
                </span>
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Bus className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Enumerated Drivers
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {initialDrivers.length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <UserCheck className="w-6 h-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Available Stickers Pool
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {availableStickers.length}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <QrCode className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Authority Letters
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {initialVehicles.filter((v) => v.status === "ACTIVE").length}
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-3 rounded-2xl border border-border/60">
        <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl">
          <Button
            variant={activeTab === "vehicles" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("vehicles")}
            className="rounded-lg gap-2 cursor-pointer text-xs font-medium">
            <Bus className="w-3.5 h-3.5" />
            Vehicles Fleet ({initialVehicles.length})
          </Button>

          <Button
            variant={activeTab === "drivers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("drivers")}
            className="rounded-lg gap-2 cursor-pointer text-xs font-medium">
            <UserCheck className="w-3.5 h-3.5" />
            Enumerated Drivers ({initialDrivers.length})
          </Button>

          <Button
            variant={activeTab === "stickers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("stickers")}
            className="rounded-lg gap-2 cursor-pointer text-xs font-medium">
            <QrCode className="w-3.5 h-3.5" />
            Sticker Inventory ({initialStickers.length})
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Enrolment filter — only meaningful on the vehicles tab */}
          {activeTab === "vehicles" && (
            <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl">
              {(
                [
                  { key: "ALL", label: "All" },
                  { key: "EXISTING", label: "Existing" },
                  { key: "NEW_JOINER", label: `New (${newJoinerCount})` },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.key}
                  variant={enrollmentFilter === opt.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEnrollmentFilter(opt.key)}
                  className="rounded-lg cursor-pointer text-xs font-medium px-2.5">
                  {opt.label}
                </Button>
              ))}
            </div>
          )}

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reg, fleet no, driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: VEHICLES FLEET TABLE */}
      {activeTab === "vehicles" && (
        <Card className="bg-card border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Registration & Fleet</th>
                  <th className="py-3.5 px-4">Category / Model</th>
                  <th className="py-3.5 px-4">Authority Ref</th>
                  <th className="py-3.5 px-4">Assigned Driver</th>
                  <th className="py-3.5 px-4">Physical Sticker</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground">
                      No TRACAS vehicles found.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <Bus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {vehicle.registrationNumber}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Fleet: {vehicle.fleetNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            variant="outline"
                            className="font-semibold uppercase text-[10px]">
                            {vehicle.category}
                          </Badge>
                          <Badge
                            className={
                              vehicle.ownershipType === "INDIVIDUAL"
                                ? "bg-purple-500/10 text-purple-500 border-purple-500/20 font-bold text-[10px]"
                                : vehicle.ownershipType === "COLLABORATIVE"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold text-[10px]"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]"
                            }>
                            {vehicle.ownershipType === "INDIVIDUAL"
                              ? "Private Owner"
                              : vehicle.ownershipType === "COLLABORATIVE"
                                ? "Franchise"
                                : "State Fleet"}
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
                        </div>
                        <p className="text-muted-foreground">
                          {vehicle.makeModel || "N/A"}
                        </p>
                        {vehicle.ownerName && (
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            Owner:{" "}
                            <span className="text-foreground font-semibold">
                              {vehicle.ownerName}
                            </span>{" "}
                            ({vehicle.ownerPhone})
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs bg-secondary px-2 py-1 rounded-md text-foreground border border-border">
                          {vehicle.authorityRef}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {vehicle.assignedDriver ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted border border-border overflow-hidden flex-shrink-0">
                              {vehicle.assignedDriver.photoUrl ? (
                                <img
                                  src={vehicle.assignedDriver.photoUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 text-muted-foreground m-1" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {vehicle.assignedDriver.fullName}
                              </p>
                              <p className="text-muted-foreground">
                                {vehicle.assignedDriver.phoneNumber}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {vehicle.sticker ? (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bound
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> No Sticker
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/tracas/${vehicle.id}/letter`}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                            <FileText className="w-3.5 h-3.5" />
                            Letter
                          </Link>

                          {/* A vehicle that already carries a sticker must be
                              confirmed through the replace prompt first. */}
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setAssignStickerForm({
                                  vehicleId: vehicle.id,
                                  stickerId: vehicle.sticker?.id || "NONE",
                                });
                                if (vehicle.sticker) {
                                  setIsReplaceStickerConfirmOpen(true);
                                } else {
                                  setIsAssignStickerOpen(true);
                                }
                              }}
                              className="h-8 px-2 text-xs gap-1 cursor-pointer">
                              {vehicle.sticker ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" /> Replace
                                  Sticker
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-3.5 h-3.5" /> Bind
                                  Sticker
                                </>
                              )}
                            </Button>
                          )}

                          {(vehicle.assignedDriverId
                            ? canReassignDriver
                            : canAssignDriver) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setReassignForm({
                                  vehicleId: vehicle.id,
                                  driverId: vehicle.assignedDriverId || "NONE",
                                });
                                setIsReassignDriverOpen(true);
                              }}
                              className="h-8 px-2 text-xs gap-1 cursor-pointer">
                              {vehicle.assignedDriverId ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" /> Reassign
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" /> Assign
                                  Driver
                                </>
                              )}
                            </Button>
                          )}

                          <Link
                            href={`/verify/tracas/${vehicle.authorityRef}`}
                            target="_blank"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: ENUMERATED DRIVERS TABLE */}
      {activeTab === "drivers" && (
        <Card className="bg-card border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Driver Name & Photo</th>
                  <th className="py-3.5 px-4">Sec. Code</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">NIN / ASIN</th>
                  <th className="py-3.5 px-4">Driver&apos;s License</th>
                  <th className="py-3.5 px-4">Assigned Vehicles</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground">
                      No enumerated TRACAS drivers found.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr
                      key={driver.id}
                      className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {driver.photoUrl ? (
                              <img
                                src={driver.photoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {driver.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {driver.stateOfOrigin || "Anambra"}{" "}
                              {driver.lga ? `· ${driver.lga}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        <Badge
                          variant="outline"
                          className="font-mono bg-primary/5 text-primary border-primary/20">
                          {driver.securityCode || "N/A"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-semibold text-foreground">
                          {driver.phoneNumber}
                        </p>
                        <p className="text-muted-foreground">
                          {driver.email || "No email"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        <p>
                          NIN:{" "}
                          <span className="font-semibold text-foreground">
                            {driver.nin || "N/A"}
                          </span>
                        </p>
                        <p>
                          ASIN:{" "}
                          <span className="font-semibold text-foreground">
                            {driver.asinNumber || "N/A"}
                          </span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        <p className="font-bold text-foreground">
                          {driver.licenseNumber || "N/A"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {driver.vehicles && driver.vehicles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {driver.vehicles.map((v) => (
                              <Badge
                                key={v.id}
                                variant="secondary"
                                className="font-mono text-[10px]">
                                {v.registrationNumber} ({v.fleetNumber})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            None
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editing a driver changes what is printed on an
                              issued ID card — System Admin only. */}
                          {isSystemAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDriver(driver)}
                              className="h-8 gap-1 text-xs cursor-pointer">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                          )}
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs">
                            <Link
                              href={`/tracas/driver/${driver.id}/id-card`}
                              target="_blank">
                              <IdCard className="w-3.5 h-3.5" /> View ID Card
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: STICKER INVENTORY TABLE */}
      {activeTab === "stickers" && (
        <Card className="bg-card border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sticker URL / Code</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Bound Vehicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredStickers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-muted-foreground">
                      No stickers pre-loaded in inventory pool.
                    </td>
                  </tr>
                ) : (
                  filteredStickers.map((sticker) => (
                    <tr
                      key={sticker.id}
                      className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <p className="font-bold text-foreground truncate max-w-md">
                          {sticker.stickerUrl}
                        </p>
                        <p className="text-muted-foreground">
                          Code: {sticker.stickerCode}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {sticker.isAssigned ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]">
                            BOUND
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold text-[10px]">
                            AVAILABLE POOL
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {sticker.assignedVehicle ? (
                          <span className="font-bold text-foreground">
                            {sticker.assignedVehicle.registrationNumber} (Fleet{" "}
                            {sticker.assignedVehicle.fleetNumber})
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Unbound
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: ONBOARD VEHICLE */}
      <Dialog
        open={isOnboardVehicleOpen}
        onOpenChange={setIsOnboardVehicleOpen}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Bus className="w-5 h-5 text-primary" />
              Onboard TRACAS Vehicle
            </DialogTitle>
            <DialogDescription>
              Register a vehicle under Transport Company of Anambra State
              (TRACAS) to issue an official Letter of Authority.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOnboardVehicle} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="registrationNumber">
                  Registration Number *
                </Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g. CH123 or AKD 910 YE"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      registrationNumber: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fleetNumber">Fleet Number</Label>
                <Input
                  disabled
                  id="fleetNumber"
                  placeholder={
                    vehicleForm.ownershipType === "GOVERNMENT_OWNED"
                      ? "Auto-assigned (e.g. FT001)"
                      : "Auto-assigned (e.g. LV001)"
                  }
                  value={vehicleForm.fleetNumber}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      fleetNumber: e.target.value,
                    })
                  }
                  className="bg-muted/30"
                />
                <p className="text-[10px] text-muted-foreground">
                  {vehicleForm.ownershipType === "GOVERNMENT_OWNED"
                    ? "Auto-generated as FT001, FT002... for Government Owned fleet."
                    : "Auto-generated as LV001, LV002... for Individual / Collaborative fleet."}
                </p>
              </div>

              {/* Enrolment status — separates vehicles already running under
                  TRACAS from those joining the company in this round. */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="font-semibold">Enrolment Status *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      value: "EXISTING",
                      title: "Existing in Company",
                      hint: "Already operating under TRACAS",
                    },
                    {
                      value: "NEW_JOINER",
                      title: "Joining Company (New)",
                      hint: "Newly onboarded to TRACAS",
                    },
                  ].map((opt) => {
                    const isSelected = vehicleForm.enrollmentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setVehicleForm({
                            ...vehicleForm,
                            enrollmentType: opt.value,
                          })
                        }
                        className={`text-left px-3.5 py-3 rounded-xl border transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-background/40 hover:bg-secondary/60"
                        }`}>
                        <span
                          className={`block text-sm font-bold ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}>
                          {opt.title}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ownershipType" className="font-semibold">
                  Vehicle Ownership Type *
                </Label>
                <Select
                  value={vehicleForm.ownershipType}
                  onValueChange={(val) =>
                    setVehicleForm({ ...vehicleForm, ownershipType: val })
                  }>
                  <SelectTrigger id="ownershipType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOVERNMENT_OWNED">
                      Government Owned (TRACAS State Fleet)
                    </SelectItem>
                    <SelectItem value="INDIVIDUAL">
                      Individual / Private Owner
                    </SelectItem>
                    <SelectItem value="COLLABORATIVE">
                      Collaborative / Franchise Partner
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {vehicleForm.ownershipType !== "GOVERNMENT_OWNED" && (
                <div className="sm:col-span-2 bg-secondary/40 border border-border p-4 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Vehicle Owner Details (Required for Private / Collaborative
                    Vehicles)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ownerName">
                        Owner Full Name / Company Name *
                      </Label>
                      <Input
                        id="ownerName"
                        placeholder="e.g. Chief Emeka Okafor"
                        value={vehicleForm.ownerName}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            ownerName: e.target.value,
                          })
                        }
                        required={
                          vehicleForm.ownershipType !== "GOVERNMENT_OWNED"
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ownerPhone">Owner Phone Number *</Label>
                      <Input
                        id="ownerPhone"
                        placeholder="e.g. 08031234567"
                        value={vehicleForm.ownerPhone}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            ownerPhone: e.target.value,
                          })
                        }
                        required={
                          vehicleForm.ownershipType !== "GOVERNMENT_OWNED"
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ownerAddress">
                        Owner Residential / Business Address
                      </Label>
                      <Input
                        id="ownerAddress"
                        placeholder="e.g. 12 Zik Avenue, Awka"
                        value={vehicleForm.ownerAddress}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            ownerAddress: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ownerNIN">Owner NIN / CAC Reg No</Label>
                      <Input
                        id="ownerNIN"
                        placeholder="e.g. 12345678901 or RC-12345"
                        value={vehicleForm.ownerNIN}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            ownerNIN: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="category">Vehicle Category</Label>
                <Select
                  value={vehicleForm.category}
                  onValueChange={(val) =>
                    setVehicleForm({ ...vehicleForm, category: val })
                  }>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUS">Bus</SelectItem>
                    <SelectItem value="MINIBUS">Minibus</SelectItem>
                    <SelectItem value="SIENNA">Sienna / MPV</SelectItem>
                    <SelectItem value="COASTER">Coaster Bus</SelectItem>
                    <SelectItem value="TAXI">Taxi</SelectItem>
                    <SelectItem value="TRUCK">Truck</SelectItem>
                    <SelectItem value="LIGHT_COMMERCIAL">
                      Light Commercial
                    </SelectItem>
                    <SelectItem value="CAR">Car</SelectItem>
                    <SelectItem value="TRICYCLE">Tricycle (Keke)</SelectItem>
                    <SelectItem value="OTHER">Other Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customType">
                  {vehicleForm.category === "OTHER"
                    ? "Specify Vehicle Type *"
                    : "Vehicle Type / Sub-Category (Optional)"}
                </Label>
                <Input
                  id="customType"
                  placeholder="e.g. 18-Seater Shuttle, Sienna LE, Executive Bus..."
                  value={vehicleForm.customType}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      customType: e.target.value,
                    })
                  }
                  required={vehicleForm.category === "OTHER"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="makeModel">Make & Model</Label>
                <Input
                  id="makeModel"
                  placeholder="e.g. Toyota Hiace Hummer"
                  value={vehicleForm.makeModel}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      makeModel: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="engineNumber">Engine Number</Label>
                <Input
                  id="engineNumber"
                  placeholder="e.g. LLMN200"
                  value={vehicleForm.engineNumber}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      engineNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chassisNumber">Chassis No / VIN</Label>
                <Input
                  id="chassisNumber"
                  placeholder="e.g. 09877662"
                  value={vehicleForm.chassisNumber}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      chassisNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceCertificateNo">
                  Insurance Certificate No.
                </Label>
                <Input
                  id="insuranceCertificateNo"
                  placeholder="e.g. LLW0003"
                  value={vehicleForm.insuranceCertificateNo}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      insuranceCertificateNo: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceCommencement">
                  Insurance Commencement
                </Label>
                <Input
                  id="insuranceCommencement"
                  type="date"
                  value={vehicleForm.insuranceCommencement}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      insuranceCommencement: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={vehicleForm.insuranceExpiry}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      insuranceExpiry: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="particularsIssueDate">
                  Particulars Issue Date
                </Label>
                <Input
                  id="particularsIssueDate"
                  type="date"
                  value={vehicleForm.particularsIssueDate}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      particularsIssueDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="particularsExpiryDate">
                  Particulars Expiry Date
                </Label>
                <Input
                  id="particularsExpiryDate"
                  type="date"
                  value={vehicleForm.particularsExpiryDate}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      particularsExpiryDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assignedRoute">Assigned Route</Label>
                <Input
                  id="assignedRoute"
                  placeholder="e.g. Awka - Onitsha Expressway"
                  value={vehicleForm.assignedRoute}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      assignedRoute: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assignedDriverId">
                  Assign Driver (Optional)
                </Label>
                <Select
                  value={vehicleForm.assignedDriverId}
                  onValueChange={(val) =>
                    setVehicleForm({ ...vehicleForm, assignedDriverId: val })
                  }>
                  <SelectTrigger id="assignedDriverId">
                    <SelectValue placeholder="Select driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      -- No Driver Assigned --
                    </SelectItem>
                    {availableDrivers.length === 0 ? (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        All enumerated drivers are already assigned to a
                        vehicle.
                      </div>
                    ) : (
                      availableDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.fullName} ({d.phoneNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stickerId">
                  Bind Pre-Loaded Sticker (Optional)
                </Label>
                <Select
                  value={vehicleForm.stickerId}
                  onValueChange={(val) =>
                    setVehicleForm({ ...vehicleForm, stickerId: val })
                  }>
                  <SelectTrigger id="stickerId">
                    <SelectValue placeholder="Select QR sticker..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      -- No Sticker Selected --
                    </SelectItem>
                    {availableStickers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.stickerCode || s.stickerUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsOnboardVehicleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-semibold">
                {isSubmitting
                  ? "Onboarding..."
                  : "Onboard Vehicle & Generate Authority"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ONBOARD DRIVER (ENUMERATION) */}
      <Dialog open={isOnboardDriverOpen} onOpenChange={setIsOnboardDriverOpen}>
        <DialogContent className="max-w-3xl bg-card text-foreground border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserPlus className="w-5 h-5 text-primary" />
              Driver Enumeration & Bio-Data Registration
            </DialogTitle>
            <DialogDescription>
              Complete driver bio-data enumeration for TRACAS identification and
              authority card licensing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOnboardDriver} className="space-y-4 py-2">
            <div className="border-b border-border pb-2">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider">
                1. Personal Bio-Data
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Azubuike Ifeanyi"
                  value={driverForm.fullName}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="e.g. 08030000000"
                  value={driverForm.phoneNumber}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      phoneNumber: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label
                  htmlFor="photo-upload-input"
                  className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Camera className="w-4 h-4 text-primary" />
                  Passport Photograph Upload *
                </Label>

                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                {driverForm.photoUrl ? (
                  <div className="flex items-center gap-4 bg-secondary/40 border border-border p-3.5 rounded-2xl">
                    <div className="w-20 h-24 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 relative shadow-sm">
                      <img
                        src={driverForm.photoUrl}
                        alt="Driver Passport Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passport
                          Photograph Selected
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Image ready to be attached to driver&apos;s official
                          Letter of Authority.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("photo-upload-input")
                              ?.click()
                          }
                          className="h-8 text-xs gap-1.5 cursor-pointer font-medium">
                          <Upload className="w-3.5 h-3.5" />
                          Change Image
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDriverForm((prev) => ({ ...prev, photoUrl: "" }))
                          }
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      document.getElementById("photo-upload-input")?.click()
                    }
                    className="border-2 border-dashed border-border hover:border-primary/60 bg-secondary/20 hover:bg-secondary/40 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      Click to Upload Passport Photograph
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select PNG, JPG, WEBP or GIF file from your device (Max
                      5MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nin">NIN (National ID Number)</Label>
                <Input
                  id="nin"
                  placeholder="11-digit NIN"
                  value={driverForm.nin}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, nin: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asinNumber">
                  ASIN Number (Anambra State ID)
                </Label>
                <Input
                  id="asinNumber"
                  placeholder="ASIN Number"
                  value={driverForm.asinNumber}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, asinNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@example.com"
                  value={driverForm.email}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="residentialAddress">Residential Address</Label>
                <Input
                  id="residentialAddress"
                  placeholder="Full residential address"
                  value={driverForm.residentialAddress}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      residentialAddress: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stateOfOrigin">State of Origin</Label>
                <Input
                  id="stateOfOrigin"
                  placeholder="e.g. Anambra"
                  value={driverForm.stateOfOrigin}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      stateOfOrigin: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lga">LGA of Origin</Label>
                <Input
                  id="lga"
                  placeholder="e.g. Awka South"
                  value={driverForm.lga}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, lga: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={driverForm.dateOfBirth}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      dateOfBirth: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={driverForm.gender}
                  onValueChange={(val) =>
                    setDriverForm({ ...driverForm, gender: val })
                  }>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-b border-border pb-2 pt-2">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider">
                2. Driver License & Next of Kin / Guarantor
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber">
                  Driver&apos;s License Number
                </Label>
                <Input
                  id="licenseNumber"
                  placeholder="e.g. WHL323"
                  value={driverForm.licenseNumber}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      licenseNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="licenseIssueDate">License Issue Date</Label>
                <Input
                  id="licenseIssueDate"
                  type="date"
                  value={driverForm.licenseIssueDate}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      licenseIssueDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="licenseExpiryDate">
                  License Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licenseExpiryDate"
                  type="date"
                  required
                  value={driverForm.licenseExpiryDate}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      licenseExpiryDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nextOfKinName">Next of Kin Name</Label>
                <Input
                  id="nextOfKinName"
                  placeholder="Full name"
                  value={driverForm.nextOfKinName}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      nextOfKinName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
                <Input
                  id="nextOfKinPhone"
                  placeholder="Phone number"
                  value={driverForm.nextOfKinPhone}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      nextOfKinPhone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guarantorName">Guarantor Name</Label>
                <Input
                  id="guarantorName"
                  placeholder="Full name"
                  value={driverForm.guarantorName}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      guarantorName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="guarantorAddress">Guarantor Address</Label>
                <Input
                  id="guarantorAddress"
                  placeholder="Address"
                  value={driverForm.guarantorAddress}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      guarantorAddress: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guarantorPhone">Guarantor Phone</Label>
                <Input
                  id="guarantorPhone"
                  placeholder="Phone number"
                  value={driverForm.guarantorPhone}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      guarantorPhone: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsOnboardDriverOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-semibold">
                {isSubmitting ? "Saving..." : "Save Enumeration Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REASSIGN DRIVER */}
      <Dialog
        open={isReassignDriverOpen}
        onOpenChange={setIsReassignDriverOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <RefreshCw className="w-5 h-5 text-primary" />
              {vehicleCurrentDriverId
                ? "Reassign Vehicle Driver"
                : "Assign Vehicle Driver"}
            </DialogTitle>
            <DialogDescription>
              {vehicleCurrentDriverId
                ? `Change the enumerated driver operating vehicle ${selectedVehicle?.registrationNumber ?? ""}.`
                : `Attach an enumerated driver to vehicle ${selectedVehicle?.registrationNumber ?? ""}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReassignDriver} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reassignDriverId">Select Driver</Label>
              <Select
                value={reassignForm.driverId}
                onValueChange={(val) =>
                  setReassignForm({ ...reassignForm, driverId: val })
                }>
                <SelectTrigger id="reassignDriverId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canReassignDriver ? (
                    <SelectItem value="NONE">-- Unassign Driver --</SelectItem>
                  ) : null}
                  {reassignDriverOptions.map((d) => {
                    const isCurrent = d.id === vehicleCurrentDriverId;
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName} ({d.phoneNumber})
                        {isCurrent ? " — current" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsReassignDriverOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3b: CONFIRM STICKER REPLACEMENT
          Gate in front of the binding modal — a vehicle already carrying a
          sticker has that code printed and in circulation, so replacing it
          retires the physical sticker on the vehicle. */}
      <Dialog
        open={isReplaceStickerConfirmOpen}
        onOpenChange={setIsReplaceStickerConfirmOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              Replace Vehicle Sticker?
            </DialogTitle>
            <DialogDescription>
              Vehicle {selectedVehicle?.registrationNumber} already has a
              sticker bound.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 my-1 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
              Currently bound
            </p>
            <p className="text-sm font-mono font-semibold text-foreground break-all">
              {selectedVehicle?.sticker?.stickerCode ||
                selectedVehicle?.sticker?.stickerUrl ||
                "—"}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Replacing releases this sticker back to the inventory pool. The
              physical sticker on the vehicle will no longer resolve to it when
              scanned.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReplaceStickerConfirmOpen(false)}
              className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsReplaceStickerConfirmOpen(false);
                setIsAssignStickerOpen(true);
              }}
              className="cursor-pointer">
              Yes, replace sticker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ASSIGN STICKER */}
      <Dialog open={isAssignStickerOpen} onOpenChange={setIsAssignStickerOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <QrCode className="w-5 h-5 text-primary" />
              Bind Physical QR Sticker
            </DialogTitle>
            <DialogDescription>
              Bind a pre-loaded physical sticker URL to vehicle{" "}
              {selectedVehicle?.registrationNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 my-2">
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Fast Live QR Camera Scanner
            </p>
            <Button
              type="button"
              onClick={() => {
                setScannerTargetVehicle(selectedVehicle);
                setIsScannerOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm w-full py-2.5 rounded-xl gap-2 shadow-lg cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4" />
              Scan Physical QR Sticker with Camera
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Point camera at physical sticker QR code to scan and bind instantly.
            </p>
          </div>

          <div className="relative my-3 flex items-center justify-center">
            <span className="bg-card px-3 text-[11px] text-muted-foreground uppercase font-bold z-10">
              Or Select From Available Inventory Pool
            </span>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          </div>

          <form onSubmit={handleAssignSticker} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="assignStickerId">Select Available Sticker</Label>
              <Select
                value={assignStickerForm.stickerId}
                onValueChange={(val) =>
                  setAssignStickerForm({ ...assignStickerForm, stickerId: val })
                }>
                <SelectTrigger id="assignStickerId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">-- Unbind Sticker --</SelectItem>
                  {availableStickers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.stickerCode || s.stickerUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAssignStickerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Save Binding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CAMERA SCANNER */}
      {/* MODAL: EDIT DRIVER PROFILE (System Admin only) */}
      <Dialog open={isEditDriverOpen} onOpenChange={setIsEditDriverOpen}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Driver Profile
            </DialogTitle>
            <DialogDescription>
              Update {editingDriver?.fullName}&apos;s record. Changes are
              reflected on their ID card and any Letter of Authority naming
              them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateDriver} className="space-y-4 py-1">
            {/* Passport photograph */}
            <div className="flex items-start gap-4">
              <div className="w-24 h-28 rounded-xl border border-border bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                {editDriverForm.photoUrl ? (
                   
                  <img
                    src={editDriverForm.photoUrl}
                    alt={editDriverForm.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground text-center px-2">
                    No photo
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="editDriverPhoto">Passport Photograph</Label>
                <Input
                  id="editDriverPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoChange}
                  className="cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG or WEBP, under 5 MB. Replaces the photo printed on
                  the ID card.
                </p>
                {editDriverForm.photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditDriverForm((prev) => ({ ...prev, photoUrl: "" }))
                    }
                    className="h-7 text-xs text-red-500 hover:text-red-500 cursor-pointer px-0">
                    Remove photo
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                id="editFullName"
                label="Full Name *"
                value={editDriverForm.fullName}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, fullName: v }))
                }
                required
              />
              <Field
                id="editPhone"
                label="Phone Number *"
                value={editDriverForm.phoneNumber}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, phoneNumber: v }))
                }
                required
              />
              <Field
                id="editEmail"
                label="Email"
                value={editDriverForm.email}
                onChange={(v) => setEditDriverForm((p) => ({ ...p, email: v }))}
              />
              <Field
                id="editNin"
                label="NIN"
                value={editDriverForm.nin}
                onChange={(v) => setEditDriverForm((p) => ({ ...p, nin: v }))}
              />
              <Field
                id="editAsin"
                label="ASIN Number"
                value={editDriverForm.asinNumber}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, asinNumber: v }))
                }
              />
              <Field
                id="editLicense"
                label="Licence Number"
                value={editDriverForm.licenseNumber}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, licenseNumber: v }))
                }
              />
              <Field
                id="editLicenseIssue"
                label="Licence Issue Date"
                type="date"
                value={editDriverForm.licenseIssueDate}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, licenseIssueDate: v }))
                }
              />
              <Field
                id="editLicenseExpiry"
                label="Licence Expiry Date"
                type="date"
                value={editDriverForm.licenseExpiryDate}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, licenseExpiryDate: v }))
                }
              />
              <Field
                id="editState"
                label="State of Origin"
                value={editDriverForm.stateOfOrigin}
                onChange={(v) =>
                  setEditDriverForm((p) => ({ ...p, stateOfOrigin: v }))
                }
              />
              <Field
                id="editLga"
                label="LGA"
                value={editDriverForm.lga}
                onChange={(v) => setEditDriverForm((p) => ({ ...p, lga: v }))}
              />
              <div className="sm:col-span-2">
                <Field
                  id="editAddress"
                  label="Residential Address"
                  value={editDriverForm.residentialAddress}
                  onChange={(v) =>
                    setEditDriverForm((p) => ({ ...p, residentialAddress: v }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editDriverForm.status}
                  onValueChange={(v) =>
                    setEditDriverForm((p) => ({ ...p, status: v }))
                  }>
                  <SelectTrigger id="editStatus">
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
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDriverOpen(false)}
                className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer">
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <StickerQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannerSuccess}
        vehicleInfo={
          scannerTargetVehicle || selectedVehicle
            ? {
                registrationNumber:
                  (scannerTargetVehicle || selectedVehicle)?.registrationNumber || "",
                fleetNumber:
                  (scannerTargetVehicle || selectedVehicle)?.fleetNumber || "",
              }
            : null
        }
      />

      {/* MODAL 5: PRE-LOAD STICKERS */}
      <Dialog open={isAddStickersOpen} onOpenChange={setIsAddStickersOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Tag className="w-5 h-5 text-primary" />
              Pre-Load Physical QR Sticker Inventory
            </DialogTitle>
            <DialogDescription>
              Paste sticker verification URLs (one per line) sent by vendor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStickers} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="batchUrls">Sticker URLs List</Label>
              <Textarea
                id="batchUrls"
                rows={5}
                placeholder="https://transpaytms.com/v/status1772628800404&#10;https://transpaytms.com/v/status1772628288905"
                value={batchStickerUrls}
                onChange={(e) => setBatchStickerUrls(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddStickersOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add to Pool"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Labelled text/date input used by the driver edit form. */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
