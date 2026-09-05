"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  User,
  MapPin,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  QrCode,
  Edit,
  Phone,
  Calendar,
  AlertCircle,
  ExternalLink,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronRight,
  Hash,
  Sparkles,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CvrStickerScannerModal } from "@/components/cvr/cvr-sticker-scanner-modal";
import {
  assignCvrVin,
  assignCvrDriver,
  unassignCvrDriver,
  updateCvrVehicle,
  getAvailableCvrDrivers,
} from "@/app/actions/cvr";
import type {
  UserRole,
  CvrVehicleCategory,
  CvrOperationType,
  CvrRegistrationStatus,
} from "@prisma/client";
import { fmtDateTimeShort, fmtDateShort } from "@/lib/utils/format";

interface VehicleDetail {
  id: string;
  plateNumber: string;
  chassisNumber: string;
  category: CvrVehicleCategory;
  make: string | null;
  model: string | null;
  year: string | null;
  vehicleType: string | null;
  asinNumber: string | null;
  tCode: string | null;
  color: string | null;
  vehicleStatus: string | null;
  stickerNumber: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  ownerGender: string | null;
  ownerMaritalStatus: string | null;
  ownerWhatsApp: string | null;
  operationType: CvrOperationType | null;
  townId: string | null;
  lgaId: string | null;
  fromTownId: string | null;
  toTownId: string | null;
  vin: string | null;
  vinAssignedAt: Date | null;
  vinAssignedByUserId: string | null;
  status: CvrRegistrationStatus;
  assignedDriverId: string | null;
  capturedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  driver: {
    id: string;
    fullName: string;
    residentialAddress: string;
    phoneNumber: string;
    gender: string;
    state: string | null;
    city: string | null;
    nokFullName: string | null;
    nokPhoneNumber: string | null;
    nokRelationship: string | null;
    passportPhotoUrl: string | null;
  } | null;
  lga: { id: string; name: string; state: string } | null;
  town: { id: string; name: string; state: string } | null;
}

interface VehicleDetailClientProps {
  vehicle: VehicleDetail;
  userRole: UserRole;
  canWrite: boolean;
  canAssignVin: boolean;
  lgas?: {
    id: string;
    name: string;
    state: string;
    towns: { id: string; name: string }[];
  }[];
  initialEditOpen?: boolean;
}

export default function VehicleDetailClient({
  vehicle: initialVehicle,
  userRole,
  canWrite,
  canAssignVin,
  lgas = [],
  initialEditOpen = false,
}: VehicleDetailClientProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetail>(initialVehicle);
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVinDialogOpen, setIsVinDialogOpen] = useState(false);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(initialEditOpen);
  const [editTab, setEditTab] = useState<
    "vehicle" | "owner" | "operational" | "driver"
  >("vehicle");

  // Available drivers state
  const [availableDrivers, setAvailableDrivers] = useState<
    {
      id: string;
      fullName: string;
      phoneNumber: string;
      passportPhotoUrl: string | null;
    }[]
  >([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

  // ── Complete Edit Fields State ──
  // 1. Vehicle Information
  const [editPlate, setEditPlate] = useState(vehicle.plateNumber);
  const [editChassis, setEditChassis] = useState(vehicle.chassisNumber);
  const [editCategory, setEditCategory] = useState<CvrVehicleCategory>(
    vehicle.category,
  );
  const [editMake, setEditMake] = useState(vehicle.make ?? "");
  const [editModel, setEditModel] = useState(vehicle.model ?? "");
  const [editYear, setEditYear] = useState(vehicle.year ?? "");
  const [editVehicleType, setEditVehicleType] = useState(
    vehicle.vehicleType ?? "",
  );
  const [editAsinNumber, setEditAsinNumber] = useState(
    vehicle.asinNumber ?? "",
  );
  const [editTCode, setEditTCode] = useState(vehicle.tCode ?? "");
  const [editColor, setEditColor] = useState(vehicle.color ?? "");
  const [editVehicleStatus, setEditVehicleStatus] = useState(
    vehicle.vehicleStatus ?? "Active",
  );
  const [editSticker, setEditSticker] = useState(vehicle.stickerNumber ?? "");

  // 2. Owner Information
  const [editOwnerName, setEditOwnerName] = useState(vehicle.ownerName ?? "");
  const [editOwnerPhone, setEditOwnerPhone] = useState(
    vehicle.ownerPhone ?? "",
  );
  const [editOwnerWhatsApp, setEditOwnerWhatsApp] = useState(
    vehicle.ownerWhatsApp ?? "",
  );
  const [editOwnerGender, setEditOwnerGender] = useState(
    vehicle.ownerGender ?? "",
  );
  const [editOwnerMaritalStatus, setEditOwnerMaritalStatus] = useState(
    vehicle.ownerMaritalStatus ?? "",
  );
  const [editOwnerAddress, setEditOwnerAddress] = useState(
    vehicle.ownerAddress ?? "",
  );

  // 3. Operational Information
  const [editOperationType, setEditOperationType] = useState<CvrOperationType>(
    vehicle.operationType ?? "TOWN_SERVICE",
  );
  const [editLgaId, setEditLgaId] = useState<string>(
    vehicle.lgaId ?? lgas[0]?.id ?? "",
  );
  const [editTownId, setEditTownId] = useState<string>(vehicle.townId ?? "");
  const [editFromTownId, setEditFromTownId] = useState<string>(
    vehicle.fromTownId ?? "",
  );
  const [editToTownId, setEditToTownId] = useState<string>(
    vehicle.toTownId ?? "",
  );

  // 4. Driver Information
  const [editDriverName, setEditDriverName] = useState(
    vehicle.driver?.fullName ?? "",
  );
  const [editDriverPhone, setEditDriverPhone] = useState(
    vehicle.driver?.phoneNumber ?? "",
  );
  const [editDriverGender, setEditDriverGender] = useState(
    vehicle.driver?.gender ?? "Male",
  );
  const [editDriverAddress, setEditDriverAddress] = useState(
    vehicle.driver?.residentialAddress ?? "",
  );
  const [editDriverState, setEditDriverState] = useState(
    vehicle.driver?.state ?? "Anambra",
  );
  const [editDriverCity, setEditDriverCity] = useState(
    vehicle.driver?.city ?? "",
  );
  const [editDriverNokName, setEditDriverNokName] = useState(
    vehicle.driver?.nokFullName ?? "",
  );
  const [editDriverNokPhone, setEditDriverNokPhone] = useState(
    vehicle.driver?.nokPhoneNumber ?? "",
  );
  const [editDriverNokRel, setEditDriverNokRel] = useState(
    vehicle.driver?.nokRelationship ?? "",
  );
  const [editDriverPhotoUrl, setEditDriverPhotoUrl] = useState<string | null>(
    vehicle.driver?.passportPhotoUrl ?? null,
  );
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);

  // Towns for selected LGA in edit modal
  const availableTownsForEdit = useMemo(() => {
    const lga = lgas.find((l) => l.id === editLgaId);
    return lga?.towns ?? [];
  }, [lgas, editLgaId]);

  // All towns for interstate selection in edit modal
  const allTownsForEdit = useMemo(() => {
    return lgas.flatMap((l) => l.towns.map((t) => ({ ...t, lgaName: l.name })));
  }, [lgas]);

  // Open Edit Record modal and re-populate all fields from latest vehicle & driver
  const handleOpenEdit = () => {
    setEditPlate(vehicle.plateNumber);
    setEditChassis(vehicle.chassisNumber);
    setEditCategory(vehicle.category);
    setEditMake(vehicle.make ?? "");
    setEditModel(vehicle.model ?? "");
    setEditYear(vehicle.year ?? "");
    setEditVehicleType(vehicle.vehicleType ?? "");
    setEditAsinNumber(vehicle.asinNumber ?? "");
    setEditTCode(vehicle.tCode ?? "");
    setEditColor(vehicle.color ?? "");
    setEditVehicleStatus(vehicle.vehicleStatus ?? "Active");
    setEditSticker(vehicle.stickerNumber ?? "");

    setEditOwnerName(vehicle.ownerName ?? "");
    setEditOwnerPhone(vehicle.ownerPhone ?? "");
    setEditOwnerWhatsApp(vehicle.ownerWhatsApp ?? "");
    setEditOwnerGender(vehicle.ownerGender ?? "");
    setEditOwnerMaritalStatus(vehicle.ownerMaritalStatus ?? "");
    setEditOwnerAddress(vehicle.ownerAddress ?? "");

    setEditOperationType(vehicle.operationType ?? "TOWN_SERVICE");
    setEditLgaId(vehicle.lgaId ?? lgas[0]?.id ?? "");
    setEditTownId(vehicle.townId ?? "");
    setEditFromTownId(vehicle.fromTownId ?? "");
    setEditToTownId(vehicle.toTownId ?? "");

    setEditDriverName(vehicle.driver?.fullName ?? "");
    setEditDriverPhone(vehicle.driver?.phoneNumber ?? "");
    setEditDriverGender(vehicle.driver?.gender ?? "Male");
    setEditDriverAddress(vehicle.driver?.residentialAddress ?? "");
    setEditDriverState(vehicle.driver?.state ?? "Anambra");
    setEditDriverCity(vehicle.driver?.city ?? "");
    setEditDriverNokName(vehicle.driver?.nokFullName ?? "");
    setEditDriverNokPhone(vehicle.driver?.nokPhoneNumber ?? "");
    setEditDriverNokRel(vehicle.driver?.nokRelationship ?? "");
    setEditDriverPhotoUrl(vehicle.driver?.passportPhotoUrl ?? null);

    setEditTab("vehicle");
    setIsEditOpen(true);
  };

  // Upload driver photo inside edit modal
  const handleEditPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be smaller than 5 MB.");
      return;
    }

    setIsUploadingEditPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "cvr-passports");
    formData.append("linkedToType", "CVR_DRIVER");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload photo.");
      }
      setEditDriverPhotoUrl(data.url);
      toast.success("Passport photo uploaded successfully.");
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setIsUploadingEditPhoto(false);
    }
  };

  // Open driver assignment picker
  const handleOpenAssignDriver = async () => {
    setIsAssignDriverOpen(true);
    setIsLoadingDrivers(true);
    try {
      const res = await getAvailableCvrDrivers();
      if (res.success) {
        setAvailableDrivers(res.drivers);
      }
    } catch {
      toast.error("Failed to load driver candidates.");
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  // Submit Driver Assignment
  const handleAssignDriverSubmit = () => {
    if (!selectedDriverId) {
      toast.error("Please select a driver.");
      return;
    }

    startTransition(async () => {
      const res = await assignCvrDriver(vehicle.id, selectedDriverId);
      if (!res.success) {
        toast.error(res.error || "Failed to assign driver.");
        return;
      }
      toast.success("Driver assigned successfully.");
      setIsAssignDriverOpen(false);
      router.refresh();
    });
  };

  // Unassign Driver
  const handleUnassignDriver = () => {
    if (
      !confirm(
        "Are you sure you want to unassign the current driver from this vehicle?",
      )
    )
      return;

    startTransition(async () => {
      const res = await unassignCvrDriver(vehicle.id);
      if (!res.success) {
        toast.error(res.error || "Failed to unassign driver.");
        return;
      }
      toast.success("Driver unassigned.");
      router.refresh();
    });
  };

  // Stage 2: Assign VIN
  const handleAssignVin = () => {
    startTransition(async () => {
      const res = await assignCvrVin(vehicle.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Stage 2 VIN Assigned: ${res.vin}`);
      setIsVinDialogOpen(false);
      router.refresh();
    });
  };

  // Sticker update from scanner
  const handleStickerScanSuccess = async (stickerCode: string) => {
    startTransition(async () => {
      const res = await updateCvrVehicle(vehicle.id, {
        stickerNumber: stickerCode,
      });
      if (!res.success) {
        toast.error(res.error || "Failed to update sticker.");
        return;
      }
      toast.success(`Sticker ${stickerCode} attached to vehicle!`);
      setVehicle((prev) => ({ ...prev, stickerNumber: stickerCode }));
      setEditSticker(stickerCode);
      router.refresh();
    });
  };

  // Edit vehicle submission — submits ALL vehicle, owner, operational and driver fields
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlate.trim()) {
      toast.error("Plate number is required.");
      setEditTab("vehicle");
      return;
    }
    if (!editChassis.trim()) {
      toast.error("Chassis number is required.");
      setEditTab("vehicle");
      return;
    }

    startTransition(async () => {
      const driverPayload = editDriverName.trim()
        ? {
            fullName: editDriverName.trim(),
            phoneNumber: editDriverPhone.trim() || undefined,
            gender: editDriverGender,
            residentialAddress: editDriverAddress.trim() || undefined,
            city: editDriverCity.trim() || undefined,
            state: editDriverState.trim() || undefined,
            nokFullName: editDriverNokName.trim() || undefined,
            nokPhoneNumber: editDriverNokPhone.trim() || undefined,
            nokRelationship: editDriverNokRel.trim() || undefined,
            passportPhotoUrl: editDriverPhotoUrl || undefined,
          }
        : undefined;

      const res = await updateCvrVehicle(vehicle.id, {
        plateNumber: editPlate.trim().toUpperCase(),
        chassisNumber: editChassis.trim().toUpperCase(),
        category: editCategory,
        make: editMake.trim() || undefined,
        model: editModel.trim() || undefined,
        year: editYear.trim() || undefined,
        vehicleType: editVehicleType.trim() || undefined,
        asinNumber: editAsinNumber.trim() || undefined,
        tCode: editTCode.trim() || undefined,
        color: editColor.trim() || undefined,
        vehicleStatus: editVehicleStatus.trim() || undefined,
        stickerNumber: editSticker.trim() || undefined,
        ownerName: editOwnerName.trim() || undefined,
        ownerPhone: editOwnerPhone.trim() || undefined,
        ownerWhatsApp: editOwnerWhatsApp.trim() || undefined,
        ownerGender: editOwnerGender || undefined,
        ownerMaritalStatus: editOwnerMaritalStatus || undefined,
        ownerAddress: editOwnerAddress.trim() || undefined,
        operationType: editOperationType,
        lgaId: editLgaId || undefined,
        townId: editTownId || undefined,
        fromTownId:
          editOperationType === "INTERSTATE"
            ? editFromTownId || undefined
            : undefined,
        toTownId:
          editOperationType === "INTERSTATE"
            ? editToTownId || undefined
            : undefined,
        driver: driverPayload as any,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update vehicle record.");
        return;
      }

      toast.success("Complete record updated successfully.");
      setIsEditOpen(false);
      router.refresh();
    });
  };

  const isIdentified = vehicle.status === "IDENTIFIED";

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/commercial-vehicles"
            className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Commercial Vehicles
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-mono text-foreground font-semibold">
            {vehicle.plateNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="gap-1.5 rounded-xl cursor-pointer">
              <Edit className="w-3.5 h-3.5" /> Edit Record
            </Button>
          )}
        </div>
      </div>

      {/* Hero Identification Banner */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          isIdentified
            ? "bg-linear-to-r from-cyan-950/40 via-card to-card border-cyan-500/40 shadow-lg shadow-cyan-950/20"
            : "bg-linear-to-r from-amber-950/30 via-card to-card border-amber-500/30 shadow-md shadow-amber-950/10"
        }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-3xl font-extrabold text-foreground tracking-tight">
                {vehicle.plateNumber}
              </span>
              <Badge
                className={
                  isIdentified
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs px-2.5 py-0.5"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-2.5 py-0.5"
                }>
                {isIdentified ? "Stage 2: Identified" : "Stage 1: Registered"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
              <span>
                Chassis:{" "}
                <strong className="font-mono text-foreground">
                  {vehicle.chassisNumber}
                </strong>
              </span>
              <span>•</span>
              <span>
                Category:{" "}
                <strong className="text-foreground">
                  {vehicle.category.replace(/_/g, " ")}
                </strong>
              </span>
              <span>•</span>
              <span>
                Onboarded:{" "}
                <strong className="text-foreground">
                  {fmtDateShort(vehicle.createdAt)}
                </strong>
              </span>
            </div>

            {/* VIN Display if Identified */}
            {isIdentified && vehicle.vin && (
              <div className="pt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    CVIN:
                  </span>
                  <span className="font-mono font-bold text-sm tracking-wider">
                    {vehicle.vin}
                  </span>
                </div>
                {vehicle.vinAssignedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Assigned {fmtDateShort(vehicle.vinAssignedAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stage 2 VIN Assignment Trigger */}
          {!isIdentified && canAssignVin && (
            <div className="flex shrink-0">
              <Button
                onClick={() => setIsVinDialogOpen(true)}
                className="gap-2 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl px-6 py-6 shadow-lg shadow-cyan-950/40 cursor-pointer">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Stage 2
                  </div>
                  <div className="text-sm leading-none">
                    Assign Official CVIN
                  </div>
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Vehicle, Operation, Owner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Particulars */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> Vehicle Particulars
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical and registration specifications
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {vehicle.category}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Make / Manufacturer
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.make || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Model
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.model || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Year
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.year || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Vehicle Type
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.vehicleType || "Commercial"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Color
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.color || "Standard"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Operational Status
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.vehicleStatus || "Active"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    ASIN Number
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {vehicle.asinNumber || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    T-Code
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {vehicle.tCode || "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Route & LGA */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Operational Scope &
                Location
              </CardTitle>
              <CardDescription className="text-xs">
                Municipal zone and approved transit routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Operation Type
                  </span>
                  <span className="font-bold text-foreground">
                    {vehicle.operationType
                      ? vehicle.operationType.replace(/_/g, " ")
                      : "Town Service"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Local Government Area
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.lga?.name ?? "Anambra State"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Operating Town / Community
                  </span>
                  <span className="font-semibold text-foreground">
                    {vehicle.town?.name ?? "Municipal Center"}
                  </span>
                </div>
              </div>

              {vehicle.operationType === "INTERSTATE" && (
                <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
                  <div className="font-bold text-foreground mb-1">
                    Interstate Route Corridor:
                  </div>
                  <div className="text-muted-foreground">
                    Designated long-haul corridor operating across state
                    borders.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Information Card */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Registered Owner
                Information
              </CardTitle>
              <CardDescription className="text-xs">
                Vehicle titleholder or enterprise custodian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vehicle.ownerName ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Owner Full Name
                    </span>
                    <span className="font-bold text-foreground">
                      {vehicle.ownerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Phone Number
                    </span>
                    <span className="font-semibold text-foreground">
                      {vehicle.ownerPhone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      WhatsApp
                    </span>
                    <span className="font-semibold text-foreground">
                      {vehicle.ownerWhatsApp || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Gender
                    </span>
                    <span className="font-semibold text-foreground">
                      {vehicle.ownerGender || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Marital Status
                    </span>
                    <span className="font-semibold text-foreground">
                      {vehicle.ownerMaritalStatus || "—"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground block text-[11px]">
                      Address
                    </span>
                    <span className="text-foreground">
                      {vehicle.ownerAddress || "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  No owner details were recorded during onboarding.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Driver & Physical Sticker */}
        <div className="space-y-6">
          {/* Driver Card */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Designated
                  Driver
                </CardTitle>
                <CardDescription className="text-xs">
                  Assigned operator for this vehicle
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicle.driver ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    {vehicle.driver.passportPhotoUrl ? (
                      <img
                        src={vehicle.driver.passportPhotoUrl}
                        alt={vehicle.driver.fullName}
                        className="w-16 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm flex shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 items-center justify-center font-bold text-lg flex shrink-0">
                        {vehicle.driver.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1 text-xs">
                      <div className="font-bold text-foreground text-sm truncate">
                        {vehicle.driver.fullName}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{vehicle.driver.phoneNumber}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {[vehicle.driver.city, vehicle.driver.state]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono">
                        {vehicle.driver.gender}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs pt-2 border-t border-border/50 space-y-1">
                    <span className="text-muted-foreground block text-[11px]">
                      Residential Address:
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {vehicle.driver.residentialAddress}
                    </p>
                  </div>

                  {vehicle.driver.nokFullName && (
                    <div className="text-xs pt-2 border-t border-border/50 space-y-1">
                      <span className="text-muted-foreground block text-[11px]">
                        Next of Kin:
                      </span>
                      <p className="text-foreground font-semibold">
                        {vehicle.driver.nokFullName}{" "}
                        {vehicle.driver.nokRelationship &&
                          `(${vehicle.driver.nokRelationship})`}
                      </p>
                      {vehicle.driver.nokPhoneNumber && (
                        <p className="text-muted-foreground text-[11px]">
                          {vehicle.driver.nokPhoneNumber}
                        </p>
                      )}
                    </div>
                  )}

                  {canWrite && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenAssignDriver}
                        className="flex-1 text-xs rounded-xl cursor-pointer">
                        Reassign Driver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleUnassignDriver}
                        className="text-xs text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer">
                        Unassign
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <UserX className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No driver is currently linked to this vehicle.
                  </p>
                  {canWrite && (
                    <Button
                      size="sm"
                      onClick={handleOpenAssignDriver}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl cursor-pointer">
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Assign Driver
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Physical Sticker Card */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" /> Physical
                Verification Sticker
              </CardTitle>
              <CardDescription className="text-xs">
                QR sticker attached to windshield / body
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicle.stickerNumber ? (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Attached Sticker Code
                  </div>
                  <div className="font-mono text-lg font-bold text-emerald-400 tracking-wider">
                    {vehicle.stickerNumber}
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Attached & Validated
                  </Badge>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground space-y-2">
                  <QrCode className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p>
                    No physical sticker has been attached to this vehicle yet.
                  </p>
                </div>
              )}

              {canWrite && (
                <Button
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full gap-2 rounded-xl text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  {vehicle.stickerNumber
                    ? "Scan New Sticker to Replace"
                    : "Scan Physical Sticker to Attach"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stage 2 Assign VIN Modal */}
      <Dialog open={isVinDialogOpen} onOpenChange={setIsVinDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-cyan-800/40 text-slate-100 p-6 rounded-3xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Assign Vehicle Identification Number (Stage 2)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Generate official Ministry identification number for{" "}
                  {vehicle.plateNumber}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">
                VIN Code Specification
              </div>
              <div className="font-mono text-sm text-cyan-300 font-bold">
                MOT/{vehicle.lga?.name ?? "LGA"}/{vehicle.town?.name ?? "Town"}
                /[Serial][Category]
              </div>
              <p className="text-[11px] text-slate-400">
                Serial is auto-incremented based on registered vehicles in{" "}
                {vehicle.town?.name ?? "this town"}.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Category Code:</span>
                <span className="font-bold text-white">
                  {vehicle.category === "TRICYCLE"
                    ? "K (Tricycle)"
                    : vehicle.category === "TRUCK"
                      ? "T (Truck)"
                      : "B (Bus/Shuttle)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Designated LGA:</span>
                <span className="font-bold text-white">
                  {vehicle.lga?.name ?? "None"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Designated Town:</span>
                <span className="font-bold text-white">
                  {vehicle.town?.name ?? "None"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsVinDialogOpen(false)}
              className="text-slate-400 hover:text-white rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={handleAssignVin}
              disabled={isPending}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl px-5 cursor-pointer">
              {isPending ? "Generating CVIN..." : "Confirm & Assign CVIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Driver Modal */}
      <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-emerald-800/40 text-slate-100 p-6 rounded-3xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Select Designated Driver
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Assign an existing onboarded driver to {vehicle.plateNumber}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isLoadingDrivers ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading drivers...</span>
              </div>
            ) : availableDrivers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No onboarded drivers available.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableDrivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDriverId(d.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      selectedDriverId === d.id
                        ? "bg-emerald-500/20 border-emerald-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                    }`}>
                    {d.passportPhotoUrl ? (
                      <img
                        src={d.passportPhotoUrl}
                        alt=""
                        className="w-9 h-9 rounded-xl object-cover flex shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 items-center justify-center font-bold text-xs flex shrink-0">
                        {d.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="font-bold truncate">{d.fullName}</div>
                      <div className="text-[11px] text-slate-400">
                        {d.phoneNumber}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsAssignDriverOpen(false)}
              className="text-slate-400 hover:text-white rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={handleAssignDriverSubmit}
              disabled={isPending || !selectedDriverId}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 cursor-pointer">
              {isPending ? "Assigning..." : "Confirm Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Edit Record Modal (Displays & Edits Everything) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-4xl bg-card border-border text-foreground p-0 rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">
                    Edit Complete Record
                  </DialogTitle>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold">
                    {editPlate || vehicle.plateNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Update vehicle particulars, ownership details, operational
                  scope & route, and designated driver.
                </DialogDescription>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-border/50 pt-4 overflow-x-auto -mx-6 px-6">
              {[
                { id: "vehicle", label: "Vehicle Particulars", icon: Truck },
                { id: "owner", label: "Owner Details", icon: User },
                { id: "operational", label: "Operation & Route", icon: MapPin },
                { id: "driver", label: "Designated Driver", icon: UserCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = editTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditTab(tab.id as typeof editTab)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          {/* Form Content */}
          <form
            onSubmit={handleEditSubmit}
            className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: VEHICLE PARTICULARS */}
              {editTab === "vehicle" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" /> Vehicle
                      Information
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Fields with <span className="text-destructive">*</span>{" "}
                      are required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Plate Number */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Plate Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editPlate}
                        onChange={(e) =>
                          setEditPlate(e.target.value.toUpperCase())
                        }
                        className="font-mono uppercase font-semibold text-xs"
                        required
                      />
                    </div>

                    {/* Chassis Number */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Chassis Number{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editChassis}
                        onChange={(e) =>
                          setEditChassis(e.target.value.toUpperCase())
                        }
                        className="font-mono uppercase text-xs"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={editCategory}
                        onValueChange={(val) =>
                          setEditCategory(val as CvrVehicleCategory)
                        }>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRICYCLE">
                            Tricycle (Keke)
                          </SelectItem>
                          <SelectItem value="SHUTTLE_BUS">
                            Shuttle Bus
                          </SelectItem>
                          <SelectItem value="BUS">Bus</SelectItem>
                          <SelectItem value="TRUCK">Truck / Haulage</SelectItem>
                          <SelectItem value="MINIBUS">Minibus</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Make */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Make</Label>
                      <Input
                        value={editMake}
                        placeholder="e.g. Toyota, Bajaj"
                        onChange={(e) => setEditMake(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Model */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Model</Label>
                      <Input
                        value={editModel}
                        placeholder="e.g. Hiace, RE Max"
                        onChange={(e) => setEditModel(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Year */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Manufacture Year
                      </Label>
                      <Input
                        value={editYear}
                        maxLength={4}
                        placeholder="e.g. 2018"
                        onChange={(e) => setEditYear(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Vehicle Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Vehicle Type
                      </Label>
                      <Input
                        value={editVehicleType}
                        placeholder="e.g. Passenger, Haulage"
                        onChange={(e) => setEditVehicleType(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Color</Label>
                      <Input
                        value={editColor}
                        placeholder="e.g. Yellow / Black"
                        onChange={(e) => setEditColor(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Operational Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Vehicle Status
                      </Label>
                      <Select
                        value={editVehicleStatus}
                        onValueChange={setEditVehicleStatus}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">
                            Active / Operational
                          </SelectItem>
                          <SelectItem value="Maintenance">
                            Under Maintenance
                          </SelectItem>
                          <SelectItem value="Pending Inspection">
                            Pending Inspection
                          </SelectItem>
                          <SelectItem value="Impounded">Impounded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ASIN Number */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        ASIN Number
                      </Label>
                      <Input
                        value={editAsinNumber}
                        placeholder="e.g. ASIN-12345"
                        onChange={(e) => setEditAsinNumber(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>

                    {/* T-Code */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">T-Code</Label>
                      <Input
                        value={editTCode}
                        placeholder="e.g. T-AWK-09"
                        onChange={(e) => setEditTCode(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>

                    {/* Physical Sticker Number with Scan QR option */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Physical Sticker Number</span>
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="text-primary hover:underline text-[11px] flex items-center gap-0.5 cursor-pointer font-medium">
                          <QrCode className="w-3 h-3" /> Scan
                        </button>
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={editSticker}
                          placeholder="e.g. MOT-CVR-00482"
                          onChange={(e) => setEditSticker(e.target.value)}
                          className="text-xs font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsScannerOpen(true)}
                          className="h-8 px-2 text-xs rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer flex shrink-0">
                          <Camera className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OWNER INFORMATION */}
              {editTab === "owner" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Registered
                      Owner Details
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      All owner fields are optional
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Owner Full Name
                      </Label>
                      <Input
                        value={editOwnerName}
                        placeholder="e.g. Chief Emeka Okafor"
                        onChange={(e) => setEditOwnerName(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Phone Number
                      </Label>
                      <Input
                        value={editOwnerPhone}
                        placeholder="e.g. 0803 123 4567"
                        onChange={(e) => setEditOwnerPhone(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        WhatsApp Number
                      </Label>
                      <Input
                        value={editOwnerWhatsApp}
                        placeholder="e.g. 0803 123 4567"
                        onChange={(e) => setEditOwnerWhatsApp(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Gender</Label>
                      <Select
                        value={editOwnerGender}
                        onValueChange={setEditOwnerGender}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Marital Status
                      </Label>
                      <Select
                        value={editOwnerMaritalStatus}
                        onValueChange={setEditOwnerMaritalStatus}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Residential / Business Address
                    </Label>
                    <Textarea
                      value={editOwnerAddress}
                      placeholder="Detailed address..."
                      onChange={(e) => setEditOwnerAddress(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: OPERATIONAL INFORMATION */}
              {editTab === "operational" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />{" "}
                      Operational Scope & Designated Location
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Operation Type
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { id: "TOWN_SERVICE", title: "Town Service" },
                        { id: "INTERCITY", title: "Intercity" },
                        { id: "INTERSTATE", title: "Interstate" },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() =>
                            setEditOperationType(op.id as CvrOperationType)
                          }
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            editOperationType === op.id
                              ? "bg-primary/15 border-primary text-foreground font-bold shadow-xs"
                              : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
                          }`}>
                          <div className="text-xs">{op.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Operating LGA
                      </Label>
                      <Select
                        value={editLgaId}
                        onValueChange={(val) => {
                          setEditLgaId(val);
                          setEditTownId("");
                        }}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select LGA" />
                        </SelectTrigger>
                        <SelectContent>
                          {lgas.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Operating Town / Community
                      </Label>
                      <Select
                        value={editTownId}
                        onValueChange={setEditTownId}
                        disabled={availableTownsForEdit.length === 0}>
                        <SelectTrigger className="text-xs">
                          <SelectValue
                            placeholder={
                              availableTownsForEdit.length > 0
                                ? "Select Town"
                                : "No towns available"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTownsForEdit.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editOperationType === "INTERSTATE" && (
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3 mt-2">
                      <div className="text-xs font-bold text-foreground">
                        Interstate Route Designation
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Departure Town (Anambra Origin)
                          </Label>
                          <Select
                            value={editFromTownId}
                            onValueChange={setEditFromTownId}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select Origin" />
                            </SelectTrigger>
                            <SelectContent>
                              {allTownsForEdit.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({t.lgaName})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Destination Town</Label>
                          <Select
                            value={editToTownId}
                            onValueChange={setEditToTownId}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select Destination" />
                            </SelectTrigger>
                            <SelectContent>
                              {allTownsForEdit.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({t.lgaName})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DRIVER INFORMATION */}
              {editTab === "driver" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />{" "}
                      Designated Driver Information
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {vehicle.driver
                        ? "Linked driver"
                        : "Fill to create & assign a driver"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Driver Full Name
                      </Label>
                      <Input
                        value={editDriverName}
                        placeholder="e.g. Sunday Chukwudi"
                        onChange={(e) => setEditDriverName(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Driver Phone Number
                      </Label>
                      <Input
                        value={editDriverPhone}
                        placeholder="e.g. 0802 345 6789"
                        onChange={(e) => setEditDriverPhone(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Gender</Label>
                      <Select
                        value={editDriverGender}
                        onValueChange={setEditDriverGender}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">State</Label>
                      <Input
                        value={editDriverState}
                        placeholder="e.g. Anambra"
                        onChange={(e) => setEditDriverState(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">City</Label>
                      <Input
                        value={editDriverCity}
                        placeholder="e.g. Onitsha"
                        onChange={(e) => setEditDriverCity(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Residential Address
                    </Label>
                    <Textarea
                      value={editDriverAddress}
                      placeholder="Street address..."
                      onChange={(e) => setEditDriverAddress(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  {/* Next of Kin */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase">
                      Next of Kin Particulars
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">NOK Full Name</Label>
                        <Input
                          value={editDriverNokName}
                          placeholder="e.g. Blessing Chukwudi"
                          onChange={(e) => setEditDriverNokName(e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">NOK Phone Number</Label>
                        <Input
                          value={editDriverNokPhone}
                          placeholder="e.g. 0812 345 6789"
                          onChange={(e) =>
                            setEditDriverNokPhone(e.target.value)
                          }
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Relationship</Label>
                        <Select
                          value={editDriverNokRel}
                          onValueChange={setEditDriverNokRel}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Sibling">Sibling</SelectItem>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Child">Child</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Driver Passport Photo */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase">
                      Driver Passport Photograph
                    </div>
                    <div className="flex items-center gap-4">
                      {editDriverPhotoUrl ? (
                        <div className="relative group">
                          <img
                            src={editDriverPhotoUrl}
                            alt="Driver"
                            className="w-16 h-20 object-cover rounded-xl border-2 border-emerald-500 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEditDriverPhotoUrl(null)}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-1 shadow-sm hover:scale-110 transition-transform cursor-pointer">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-20 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                          <Camera className="w-5 h-5 mb-1 text-muted-foreground/60" />
                          <span>No photo</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label
                          htmlFor="editDriverPhotoInput"
                          className="text-xs font-semibold block">
                          Upload / Replace Photograph
                        </Label>
                        <input
                          id="editDriverPhotoInput"
                          type="file"
                          accept="image/*"
                          onChange={handleEditPhotoUpload}
                          disabled={isUploadingEditPhoto}
                          className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {isUploadingEditPhoto
                            ? "Uploading photograph..."
                            : "JPG, PNG or WEBP under 5 MB."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Section Controls & Save */}
            <div className="border-t border-border/60 bg-muted/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editTab !== "vehicle" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (editTab === "driver") setEditTab("operational");
                      else if (editTab === "operational") setEditTab("owner");
                      else if (editTab === "owner") setEditTab("vehicle");
                    }}
                    className="rounded-xl text-xs gap-1 cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous Section
                  </Button>
                )}
                {editTab !== "driver" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (editTab === "vehicle") setEditTab("owner");
                      else if (editTab === "owner") setEditTab("operational");
                      else if (editTab === "operational") setEditTab("driver");
                    }}
                    className="rounded-xl text-xs gap-1 cursor-pointer">
                    Next Section <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-5 shadow-sm cursor-pointer">
                  {isPending ? "Saving All..." : "Save All Changes"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal for Sticker */}
      <CvrStickerScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        vehiclePlate={vehicle.plateNumber}
        onScanSuccess={handleStickerScanSuccess}
      />
    </div>
  );
}
