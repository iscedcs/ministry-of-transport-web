"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  User,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Upload,
  AlertCircle,
  Sparkles,
  Phone,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CvrStickerScannerModal } from "@/components/cvr/cvr-sticker-scanner-modal";
import { createCvrRegistration } from "@/app/actions/cvr";
import type { CvrVehicleCategory, CvrOperationType, UserRole } from "@prisma/client";

interface LgaWithTowns {
  id: string;
  name: string;
  state: string;
  towns: { id: string; name: string }[];
}

interface RegisterClientProps {
  lgas: LgaWithTowns[];
  userRole: UserRole;
}

export default function RegisterClient({ lgas, userRole }: RegisterClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, startTransition] = useTransition();

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ── Step 1: Vehicle & Owner State ──
  const [plateNumber, setPlateNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [category, setCategory] = useState<CvrVehicleCategory>("SHUTTLE_BUS");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [asinNumber, setAsinNumber] = useState("");
  const [tCode, setTCode] = useState("");
  const [color, setColor] = useState("");
  const [vehicleStatus, setVehicleStatus] = useState("Active");
  const [stickerNumber, setStickerNumber] = useState("");

  // Owner fields (optional)
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerWhatsApp, setOwnerWhatsApp] = useState("");
  const [ownerGender, setOwnerGender] = useState("");
  const [ownerMaritalStatus, setOwnerMaritalStatus] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");

  // ── Step 2: Driver State ──
  const [useOwnerAsDriver, setUseOwnerAsDriver] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverAddress, setDriverAddress] = useState("");
  const [driverGender, setDriverGender] = useState("Male");
  const [driverState, setDriverState] = useState("Anambra");
  const [driverCity, setDriverCity] = useState("");
  // Next of Kin
  const [nokFullName, setNokFullName] = useState("");
  const [nokPhoneNumber, setNokPhoneNumber] = useState("");
  const [nokRelationship, setNokRelationship] = useState("");
  // Passport
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // ── Step 3: Operational Information ──
  const [operationType, setOperationType] = useState<CvrOperationType>("TOWN_SERVICE");
  const [selectedLgaId, setSelectedLgaId] = useState<string>(lgas[0]?.id ?? "");
  const [selectedTownId, setSelectedTownId] = useState<string>("");
  const [fromTownId, setFromTownId] = useState<string>("");
  const [toTownId, setToTownId] = useState<string>("");

  // Towns filtered for selected LGA
  const availableTowns = useMemo(() => {
    const lga = lgas.find((l) => l.id === selectedLgaId);
    return lga?.towns ?? [];
  }, [lgas, selectedLgaId]);

  // All towns flattened for interstate selection
  const allTowns = useMemo(() => {
    return lgas.flatMap((l) => l.towns.map((t) => ({ ...t, lgaName: l.name })));
  }, [lgas]);

  // Sync owner -> driver if checkbox toggled
  const handleUseOwnerAsDriverToggle = (checked: boolean) => {
    setUseOwnerAsDriver(checked);
    if (checked) {
      if (ownerName) setDriverName(ownerName);
      if (ownerPhone) setDriverPhone(ownerPhone);
      if (ownerAddress) setDriverAddress(ownerAddress);
      if (ownerGender) setDriverGender(ownerGender);
    }
  };

  // Passport photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingPhoto(true);
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
      setPassportPhotoUrl(data.url);
      toast.success("Passport photo uploaded successfully.");
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!plateNumber.trim()) {
      toast.error("Plate number is required.");
      return false;
    }
    if (!chassisNumber.trim()) {
      toast.error("Chassis number is required.");
      return false;
    }
    if (!category) {
      toast.error("Vehicle category is required.");
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!driverName.trim()) {
      toast.error("Driver full name is required.");
      return false;
    }
    if (!driverPhone.trim()) {
      toast.error("Driver phone number is required.");
      return false;
    }
    if (!driverAddress.trim()) {
      toast.error("Driver residential address is required.");
      return false;
    }
    if (!driverGender.trim()) {
      toast.error("Driver gender is required.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2()) return;

    startTransition(async () => {
      const payload = {
        vehicle: {
          plateNumber: plateNumber.trim().toUpperCase(),
          chassisNumber: chassisNumber.trim().toUpperCase(),
          category,
          make: make.trim() || undefined,
          model: model.trim() || undefined,
          year: year.trim() || undefined,
          vehicleType: vehicleType.trim() || undefined,
          asinNumber: asinNumber.trim() || undefined,
          tCode: tCode.trim() || undefined,
          color: color.trim() || undefined,
          vehicleStatus: vehicleStatus.trim() || undefined,
          stickerNumber: stickerNumber.trim() || undefined,
          ownerName: ownerName.trim() || undefined,
          ownerPhone: ownerPhone.trim() || undefined,
          ownerAddress: ownerAddress.trim() || undefined,
          ownerGender: ownerGender || undefined,
          ownerMaritalStatus: ownerMaritalStatus || undefined,
          ownerWhatsApp: ownerWhatsApp.trim() || undefined,
          operationType,
          lgaId: selectedLgaId || undefined,
          townId: selectedTownId || undefined,
          fromTownId: operationType === "INTERSTATE" ? fromTownId || undefined : undefined,
          toTownId: operationType === "INTERSTATE" ? toTownId || undefined : undefined,
        },
        driver: {
          fullName: driverName.trim(),
          phoneNumber: driverPhone.trim(),
          residentialAddress: driverAddress.trim(),
          gender: driverGender,
          state: driverState.trim() || undefined,
          city: driverCity.trim() || undefined,
          nokFullName: nokFullName.trim() || undefined,
          nokPhoneNumber: nokPhoneNumber.trim() || undefined,
          nokRelationship: nokRelationship.trim() || undefined,
          passportPhotoUrl: passportPhotoUrl || undefined,
        },
      };

      const res = await createCvrRegistration(payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success(`Vehicle ${plateNumber.toUpperCase()} registered successfully!`);
      router.push(`/commercial-vehicles/${res.vehicleId}`);
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link href="/commercial-vehicles" className="hover:underline">
            Commercial Vehicles
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">New Registration</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Commercial Vehicle Onboarding
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stage 1: Register commercial vehicle, designate driver, and configure operational route.
        </p>
      </div>

      {/* 3-Step Indicator */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: 1, label: "Vehicle & Owner", icon: Truck },
          { step: 2, label: "Driver Information", icon: User },
          { step: 3, label: "Operation & Submit", icon: MapPin },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <div
              key={s.step}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? "bg-primary/10 border-primary text-primary shadow-xs"
                  : isDone
                  ? "bg-card border-emerald-500/30 text-emerald-400"
                  : "bg-card/40 border-border/60 text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider">Step {s.step}</div>
                <div className="text-xs sm:text-sm font-bold truncate text-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Vehicle & Owner Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Truck className="w-4 h-4" /> Vehicle Particulars
              </div>
              <CardTitle className="text-lg">Vehicle Information</CardTitle>
              <CardDescription className="text-xs">
                Fields marked with an asterisk (<span className="text-destructive">*</span>) are mandatory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plate Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="plateNumber" className="text-xs font-semibold">
                    Plate Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plateNumber"
                    placeholder="e.g. AWK-423-XA"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    className="font-mono uppercase font-semibold"
                    required
                  />
                </div>

                {/* Chassis Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="chassisNumber" className="text-xs font-semibold">
                    Chassis Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="chassisNumber"
                    placeholder="e.g. 1HGCR2F83HA001923"
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(val) => setCategory(val as CvrVehicleCategory)}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRICYCLE">Tricycle (Keke) — Code K</SelectItem>
                      <SelectItem value="SHUTTLE_BUS">Shuttle Bus — Code B</SelectItem>
                      <SelectItem value="BUS">Bus — Code B</SelectItem>
                      <SelectItem value="TRUCK">Truck / Haulage — Code T</SelectItem>
                      <SelectItem value="MINIBUS">Minibus — Code B</SelectItem>
                      <SelectItem value="OTHER">Other Commercial Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Make */}
                <div className="space-y-1.5">
                  <Label htmlFor="make" className="text-xs font-semibold">
                    Vehicle Make
                  </Label>
                  <Input
                    id="make"
                    placeholder="e.g. Toyota, Bajaj, TVS, Mack"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                  />
                </div>

                {/* Vehicle Model */}
                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-xs font-semibold">
                    Vehicle Model
                  </Label>
                  <Input
                    id="model"
                    placeholder="e.g. Hiace, RE Maxima, King"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs font-semibold">
                    Manufacture Year
                  </Label>
                  <Input
                    id="year"
                    placeholder="e.g. 2018"
                    maxLength={4}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleType" className="text-xs font-semibold">
                    Vehicle Type
                  </Label>
                  <Input
                    id="vehicleType"
                    placeholder="e.g. Passenger Bus, Box Truck, Delivery Van"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  />
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="text-xs font-semibold">
                    Color
                  </Label>
                  <Input
                    id="color"
                    placeholder="e.g. Yellow / Black, White"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>

                {/* ASIN Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="asinNumber" className="text-xs font-semibold">
                    ASIN Number
                  </Label>
                  <Input
                    id="asinNumber"
                    placeholder="e.g. ASIN-8392019"
                    value={asinNumber}
                    onChange={(e) => setAsinNumber(e.target.value)}
                  />
                </div>

                {/* T-Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="tCode" className="text-xs font-semibold">
                    T-Code
                  </Label>
                  <Input
                    id="tCode"
                    placeholder="e.g. T-AWK-019"
                    value={tCode}
                    onChange={(e) => setTCode(e.target.value)}
                  />
                </div>

                {/* Vehicle Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleStatus" className="text-xs font-semibold">
                    Vehicle Status
                  </Label>
                  <Select value={vehicleStatus} onValueChange={setVehicleStatus}>
                    <SelectTrigger id="vehicleStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active / Operational</SelectItem>
                      <SelectItem value="Maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="Pending Inspection">Pending Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Physical Sticker Number with Scan QR option */}
                <div className="space-y-1.5">
                  <Label htmlFor="stickerNumber" className="text-xs font-semibold flex items-center justify-between">
                    <span>Physical Sticker Number</span>
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Scan Sticker
                    </button>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="stickerNumber"
                      placeholder="e.g. MOT-CVR-00482"
                      value={stickerNumber}
                      onChange={(e) => setStickerNumber(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsScannerOpen(true)}
                      className="gap-1.5 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Scan
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Information (Optional per spec) */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <User className="w-4 h-4" /> Ownership Details (Optional)
              </div>
              <CardTitle className="text-lg">Owner Information</CardTitle>
              <CardDescription className="text-xs">
                All owner fields are optional. Leave blank if registering as an institutional fleet or owner details are not immediately available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-semibold">
                    Owner Full Name
                  </Label>
                  <Input
                    id="ownerName"
                    placeholder="e.g. Chief Emeka Okafor"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerPhone" className="text-xs font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="ownerPhone"
                    placeholder="e.g. 0803 123 4567"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerWhatsApp" className="text-xs font-semibold">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="ownerWhatsApp"
                    placeholder="e.g. 0803 123 4567"
                    value={ownerWhatsApp}
                    onChange={(e) => setOwnerWhatsApp(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerGender" className="text-xs font-semibold">
                    Gender
                  </Label>
                  <Select value={ownerGender} onValueChange={setOwnerGender}>
                    <SelectTrigger id="ownerGender">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerMaritalStatus" className="text-xs font-semibold">
                    Marital Status
                  </Label>
                  <Select value={ownerMaritalStatus} onValueChange={setOwnerMaritalStatus}>
                    <SelectTrigger id="ownerMaritalStatus">
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
                <Label htmlFor="ownerAddress" className="text-xs font-semibold">
                  Residential / Business Address
                </Label>
                <Textarea
                  id="ownerAddress"
                  placeholder="Street address, community, city..."
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleNextStep}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-6 cursor-pointer"
            >
              Continue to Driver Info <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Driver Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                    <User className="w-4 h-4" /> Designated Driver
                  </div>
                  <CardTitle className="text-lg">Driver Information</CardTitle>
                </div>

                {/* Auto-fill from Owner toggle */}
                {ownerName && (
                  <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-muted/60 border border-border/80">
                    <Checkbox
                      id="useOwnerAsDriver"
                      checked={useOwnerAsDriver}
                      onCheckedChange={(c) => handleUseOwnerAsDriverToggle(!!c)}
                    />
                    <Label
                      htmlFor="useOwnerAsDriver"
                      className="text-xs font-semibold cursor-pointer text-foreground"
                    >
                      Use Owner as Driver
                    </Label>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                Provide identity and contact details for the designated commercial vehicle driver.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="driverName" className="text-xs font-semibold">
                    Driver Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="driverName"
                    placeholder="e.g. Sunday Chukwudi"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="driverPhone" className="text-xs font-semibold">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="driverPhone"
                    placeholder="e.g. 0802 345 6789"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    required
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="driverGender" className="text-xs font-semibold">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select value={driverGender} onValueChange={setDriverGender}>
                    <SelectTrigger id="driverGender">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <Label htmlFor="driverState" className="text-xs font-semibold">
                    State of Residence
                  </Label>
                  <Input
                    id="driverState"
                    placeholder="e.g. Anambra"
                    value={driverState}
                    onChange={(e) => setDriverState(e.target.value)}
                  />
                </div>

                {/* City */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="driverCity" className="text-xs font-semibold">
                    City / Town of Residence
                  </Label>
                  <Input
                    id="driverCity"
                    placeholder="e.g. Onitsha, Awka, Nnewi"
                    value={driverCity}
                    onChange={(e) => setDriverCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Residential Address */}
              <div className="space-y-1.5">
                <Label htmlFor="driverAddress" className="text-xs font-semibold">
                  Residential Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="driverAddress"
                  placeholder="Detailed street and quarter address..."
                  value={driverAddress}
                  onChange={(e) => setDriverAddress(e.target.value)}
                  rows={2}
                  required
                />
              </div>

              {/* Next of Kin */}
              <div className="pt-2 border-t border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Next of Kin (NOK)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nokFullName" className="text-xs font-semibold">
                      NOK Full Name
                    </Label>
                    <Input
                      id="nokFullName"
                      placeholder="e.g. Blessing Chukwudi"
                      value={nokFullName}
                      onChange={(e) => setNokFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nokPhoneNumber" className="text-xs font-semibold">
                      NOK Phone Number
                    </Label>
                    <Input
                      id="nokPhoneNumber"
                      placeholder="e.g. 0812 345 6789"
                      value={nokPhoneNumber}
                      onChange={(e) => setNokPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nokRelationship" className="text-xs font-semibold">
                      Relationship
                    </Label>
                    <Select value={nokRelationship} onValueChange={setNokRelationship}>
                      <SelectTrigger id="nokRelationship">
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

              {/* Passport Photograph Upload */}
              <div className="pt-2 border-t border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Driver Passport Photograph
                </h4>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {passportPhotoUrl ? (
                    <div className="relative group">
                      <img
                        src={passportPhotoUrl}
                        alt="Driver Passport"
                        className="w-24 h-28 object-cover rounded-2xl border-2 border-emerald-500 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setPassportPhotoUrl(null)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-sm hover:scale-110 transition-transform cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-28 rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center">
                      <Camera className="w-6 h-6 mb-1 text-muted-foreground/60" />
                      <span>No photo</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="photoUpload" className="text-xs font-semibold block">
                      Upload Passport (DO Spaces cvr-passports)
                    </Label>
                    <input
                      id="photoUpload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {isUploadingPhoto ? "Uploading photograph to Spaces..." : "JPG, PNG or WEBP under 5 MB."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="gap-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Vehicle
            </Button>
            <Button
              type="button"
              onClick={handleNextStep}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-6 cursor-pointer"
            >
              Continue to Operation <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Operational Information & Submission */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4" /> Operational Scope
              </div>
              <CardTitle className="text-lg">Operational & Route Information</CardTitle>
              <CardDescription className="text-xs">
                Select the vehicle&apos;s primary base of operation and route designation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Operation Type Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="operationType" className="text-xs font-semibold">
                  Category / Type of Operation
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      id: "TOWN_SERVICE",
                      title: "Town Service",
                      desc: "Intra-town routes, tricycles & shuttles within municipal boundaries.",
                    },
                    {
                      id: "INTERCITY",
                      title: "Intercity",
                      desc: "Connecting towns within Anambra State (e.g. Awka ↔ Onitsha ↔ Nnewi).",
                    },
                    {
                      id: "INTERSTATE",
                      title: "Interstate",
                      desc: "Long-haul routes crossing state borders to other states.",
                    },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setOperationType(op.id as CvrOperationType)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        operationType === op.id
                          ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                          : "bg-card border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div className="font-bold text-sm text-foreground">{op.title}</div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{op.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Local Government & Town Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lgaSelect" className="text-xs font-semibold">
                    Operating Local Government Area (LGA)
                  </Label>
                  <Select
                    value={selectedLgaId}
                    onValueChange={(val) => {
                      setSelectedLgaId(val);
                      setSelectedTownId("");
                    }}
                  >
                    <SelectTrigger id="lgaSelect">
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
                  <Label htmlFor="townSelect" className="text-xs font-semibold">
                    Operating Town / Community
                  </Label>
                  <Select
                    value={selectedTownId}
                    onValueChange={setSelectedTownId}
                    disabled={availableTowns.length === 0}
                  >
                    <SelectTrigger id="townSelect">
                      <SelectValue
                        placeholder={
                          availableTowns.length > 0 ? "Select Town / Community" : "No towns preloaded"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTowns.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interstate route dropdowns (if Interstate) */}
              {operationType === "INTERSTATE" && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 mt-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Interstate Route Endpoints
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fromTown" className="text-xs">
                        Departure Town (Anambra Origin)
                      </Label>
                      <Select value={fromTownId} onValueChange={setFromTownId}>
                        <SelectTrigger id="fromTown">
                          <SelectValue placeholder="Select Origin Town" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTowns.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.lgaName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="toTown" className="text-xs">
                        Destination Town
                      </Label>
                      <Select value={toTownId} onValueChange={setToTownId}>
                        <SelectTrigger id="toTown">
                          <SelectValue placeholder="Select Destination Town" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTowns.map((t) => (
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
            </CardContent>
          </Card>

          {/* Review Summary Card */}
          <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> Final Review
              </div>
              <CardTitle className="text-base">Ready to Complete Stage 1 Onboarding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-background/50 border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Plate Number</span>
                  <strong className="font-mono text-foreground">{plateNumber.toUpperCase()}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Category</span>
                  <strong className="text-foreground">{category.replace(/_/g, " ")}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Driver Name</span>
                  <strong className="text-foreground">{driverName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sticker Number</span>
                  <strong className="font-mono text-emerald-400">
                    {stickerNumber || "None Attached"}
                  </strong>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Submitting will save this vehicle as <strong>REGISTERED (Stage 1 Complete)</strong> and generate an audit log entry. Designees with VIN assignment privileges can then issue a Vehicle Identification Number (Stage 2).
              </p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="gap-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Driver Info
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-8 shadow-lg shadow-emerald-950/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>Submitting Registration...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Submit Registration
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal for Sticker */}
      <CvrStickerScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        vehiclePlate={plateNumber || undefined}
        onScanSuccess={(code) => {
          setStickerNumber(code);
        }}
      />
    </div>
  );
}
