"use client";

/**
 * Fleet Application Form — Ministry of Transport Platform
 * STORY-041 / STORY-042 | FR-020 / FR-021 / FR-022
 *
 * Four-step wizard:
 *  1. Your Information (owner profile, read-only)
 *  2. Company details (company name, CAC, ASIN, contact info, documents)
 *  3. Terminal location & manager (address, GPS, manager name/phone/email/residential)
 *  4. Vehicle types & counts (declare how many of each type - detailed submission deferred)
 *
 * Access: EXTERNAL_APPLICANT
 */

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitFleetApplication } from "@/app/actions/mass-transit";
import { uploadCacDocument } from "@/app/actions/upload";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { getMyProfile, type UserProfile } from "@/app/actions/auth";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type VehicleType = "BUS" | "MINIBUS" | "TRUCK" | "LIGHT_COMMERCIAL" | "TANKER";

interface Terminal {
  id: string; // local UI id
  locationAddress: string;
  gpsCoordinates: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  managerResidentialAddress: string;
}

interface WizardData {
  // Step 1: Company details
  companyName: string;
  cacNumber: string;
  asinNumber: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  cacDocumentId: string;
  cacDocumentUrl: string;
  cacDocumentName: string;
  landOwnershipDocId: string;
  landOwnershipDocUrl: string;
  landOwnershipDocName: string;
  corporateAsinDocumentId: string;
  corporateAsinDocumentUrl: string;
  corporateAsinDocumentName: string;
  toiletPhotoId: string;
  toiletPhotoUrl: string;
  toiletPhotoName: string;
  waitingAreaPhotoId: string;
  waitingAreaPhotoUrl: string;
  waitingAreaPhotoName: string;
  signagePhotoId: string;
  signagePhotoUrl: string;
  signagePhotoName: string;
  waterFacilityPhotoId: string;
  waterFacilityPhotoUrl: string;
  waterFacilityPhotoName: string;
  cctvPhotoId: string;
  cctvPhotoUrl: string;
  cctvPhotoName: string;

  // Step 2: Terminals (multiple terminals, each with manager)
  terminals: Terminal[];

  // Step 3: Vehicle counts
  vehicleTypeCounts: Record<VehicleType, number>;
}

interface OwnerDisplayData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  asin?: string;
}

function emptyTerminal(): Terminal {
  return {
    id: Math.random().toString(36).slice(2),
    locationAddress: "",
    gpsCoordinates: "",
    managerName: "",
    managerPhone: "",
    managerEmail: "",
    managerResidentialAddress: "",
  };
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "BUS", label: "Bus" },
  { value: "MINIBUS", label: "Minibus" },
  { value: "TRUCK", label: "Truck" },
  { value: "LIGHT_COMMERCIAL", label: "Light Commercial" },
  { value: "TANKER", label: "Tanker" },
];

const EMPTY: WizardData = {
  companyName: "",
  cacNumber: "",
  asinNumber: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  cacDocumentId: "",
  cacDocumentUrl: "",
  cacDocumentName: "",
  landOwnershipDocId: "",
  landOwnershipDocUrl: "",
  landOwnershipDocName: "",
  corporateAsinDocumentId: "",
  corporateAsinDocumentUrl: "",
  corporateAsinDocumentName: "",
  toiletPhotoId: "",
  toiletPhotoUrl: "",
  toiletPhotoName: "",
  waitingAreaPhotoId: "",
  waitingAreaPhotoUrl: "",
  waitingAreaPhotoName: "",
  signagePhotoId: "",
  signagePhotoUrl: "",
  signagePhotoName: "",
  waterFacilityPhotoId: "",
  waterFacilityPhotoUrl: "",
  waterFacilityPhotoName: "",
  cctvPhotoId: "",
  cctvPhotoUrl: "",
  cctvPhotoName: "",
  terminals: [emptyTerminal()],
  vehicleTypeCounts: {
    BUS: 0,
    MINIBUS: 0,
    TRUCK: 0,
    LIGHT_COMMERCIAL: 0,
    TANKER: 0,
  },
};

const STEPS = [
  { id: 1, label: "Your Information" },
  { id: 2, label: "Company Details" },
  { id: 3, label: "Terminal & Manager" },
  { id: 4, label: "Vehicle Fleet" },
];

// ── Helpers -----------------------------------------------------------------

type StepErrors = Partial<Record<keyof WizardData, string>>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  required = true,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive ml-1">*</span>
        ) : (
          <span className="text-muted-foreground font-normal text-xs ml-1">
            (optional)
          </span>
        )}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  );
}

// ── Step progress bar -------------------------------------------------------

function StepProgress({
  current,
  completed,
}: {
  current: number;
  completed: Set<number>;
}) {
  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground mb-3 sm:hidden">
        Step {current} of {STEPS.length} -{" "}
        <span className="text-foreground font-medium">
          {STEPS[current - 1].label}
        </span>
      </p>

      <ol className="hidden sm:flex items-center w-full">
        {STEPS.map((step, idx) => {
          const isDone = completed.has(step.id);
          const isActive = step.id === current;
          const isLast = idx === STEPS.length - 1;
          return (
            <li
              key={step.id}
              className={cn("flex items-center", !isLast && "flex-1")}>
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-semibold shrink-0 transition-colors",
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-background",
                )}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-xs font-medium whitespace-nowrap",
                  isActive
                    ? "text-foreground"
                    : isDone
                      ? "text-primary"
                      : "text-muted-foreground",
                )}>
                {step.label}
              </span>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-px mx-3",
                    isDone ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── File upload widget ──────────────────────────────────────────────────────

function FileUploadField({
  label,
  hint,
  required = true,
  documentName,
  documentUrl,
  uploading,
  error,
  onSelect,
  onClear,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  documentName: string;
  documentUrl: string;
  uploading: boolean;
  error?: string;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required ? (
          <span className="text-destructive ml-1">*</span>
        ) : (
          <span className="text-muted-foreground font-normal text-xs ml-1">
            (optional)
          </span>
        )}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}

      {documentUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {documentName}
            </p>
            <p className="text-xs text-muted-foreground">
              Uploaded successfully
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            aria-label="Remove file">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground",
            "hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Click to upload PDF, JPEG, or PNG
              (max 5 MB)
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      <FieldError message={error} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function ApplyFleetPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | undefined>();
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const [data, setData] = useState<WizardData>(EMPTY);

  // Document upload states
  const [uploadingCac, setUploadingCac] = useState(false);
  const [cacError, setCacError] = useState("");
  const [uploadingLand, setUploadingLand] = useState(false);
  const [landError, setLandError] = useState("");
  const [uploadingAsin, setUploadingAsin] = useState(false);
  const [asinError, setAsinError] = useState("");

  useEffect(() => {
    getMyProfile().then((result) => {
      if (result.success) {
        setOwnerProfile(result.data as UserProfile);
      }
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────

  async function handleCacUpload(file: File) {
    setUploadingCac(true);
    setCacError("");
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        cacDocumentId: result.documentId,
        cacDocumentUrl: result.url,
        cacDocumentName: file.name,
      }));
    } else {
      setCacError(result.error || "Upload failed");
    }
    setUploadingCac(false);
  }

  function clearCacDocument() {
    setData((prev) => ({
      ...prev,
      cacDocumentId: "",
      cacDocumentUrl: "",
      cacDocumentName: "",
    }));
  }

  async function handleLandUpload(file: File) {
    setUploadingLand(true);
    setLandError("");
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        landOwnershipDocId: result.documentId,
        landOwnershipDocUrl: result.url,
        landOwnershipDocName: file.name,
      }));
    } else {
      setLandError(result.error || "Upload failed");
    }
    setUploadingLand(false);
  }

  function clearLandDocument() {
    setData((prev) => ({
      ...prev,
      landOwnershipDocId: "",
      landOwnershipDocUrl: "",
      landOwnershipDocName: "",
    }));
  }

  async function handleAsinUpload(file: File) {
    setUploadingAsin(true);
    setAsinError("");
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        corporateAsinDocumentId: result.documentId,
        corporateAsinDocumentUrl: result.url,
        corporateAsinDocumentName: file.name,
      }));
    } else {
      setAsinError(result.error || "Upload failed");
    }
    setUploadingAsin(false);
  }

  function clearAsinDocument() {
    setData((prev) => ({
      ...prev,
      corporateAsinDocumentId: "",
      corporateAsinDocumentUrl: "",
      corporateAsinDocumentName: "",
    }));
  }

  const [uploadingToilet, setUploadingToilet] = useState(false);

  async function handleToiletUpload(file: File) {
    setUploadingToilet(true);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        toiletPhotoId: result.documentId,
        toiletPhotoUrl: result.url,
        toiletPhotoName: file.name,
      }));
    }
    setUploadingToilet(false);
  }

  function clearToiletPhoto() {
    setData((prev) => ({
      ...prev,
      toiletPhotoId: "",
      toiletPhotoUrl: "",
      toiletPhotoName: "",
    }));
  }

  const [uploadingWaitingArea, setUploadingWaitingArea] = useState(false);

  async function handleWaitingAreaUpload(file: File) {
    setUploadingWaitingArea(true);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        waitingAreaPhotoId: result.documentId,
        waitingAreaPhotoUrl: result.url,
        waitingAreaPhotoName: file.name,
      }));
    }
    setUploadingWaitingArea(false);
  }

  function clearWaitingAreaPhoto() {
    setData((prev) => ({
      ...prev,
      waitingAreaPhotoId: "",
      waitingAreaPhotoUrl: "",
      waitingAreaPhotoName: "",
    }));
  }

  const [uploadingSignage, setUploadingSignage] = useState(false);

  async function handleSignageUpload(file: File) {
    setUploadingSignage(true);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        signagePhotoId: result.documentId,
        signagePhotoUrl: result.url,
        signagePhotoName: file.name,
      }));
    }
    setUploadingSignage(false);
  }

  function clearSignagePhoto() {
    setData((prev) => ({
      ...prev,
      signagePhotoId: "",
      signagePhotoUrl: "",
      signagePhotoName: "",
    }));
  }

  const [uploadingWaterFacility, setUploadingWaterFacility] = useState(false);

  async function handleWaterFacilityUpload(file: File) {
    setUploadingWaterFacility(true);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        waterFacilityPhotoId: result.documentId,
        waterFacilityPhotoUrl: result.url,
        waterFacilityPhotoName: file.name,
      }));
    }
    setUploadingWaterFacility(false);
  }

  function clearWaterFacilityPhoto() {
    setData((prev) => ({
      ...prev,
      waterFacilityPhotoId: "",
      waterFacilityPhotoUrl: "",
      waterFacilityPhotoName: "",
    }));
  }

  const [uploadingCctv, setUploadingCctv] = useState(false);

  async function handleCctvUpload(file: File) {
    setUploadingCctv(true);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        cctvPhotoId: result.documentId,
        cctvPhotoUrl: result.url,
        cctvPhotoName: file.name,
      }));
    }
    setUploadingCctv(false);
  }

  function clearCctvPhoto() {
    setData((prev) => ({
      ...prev,
      cctvPhotoId: "",
      cctvPhotoUrl: "",
      cctvPhotoName: "",
    }));
  }

  // ────────────────────────────────────────────────────────────────────────────

  function validateStep(step: number): boolean {
    const errors: StepErrors = {};

    // Step 1: Your Information (read-only, no validation)
    if (step === 1) {
      return true;
    }

    // Step 2: Company Details
    if (step === 2) {
      if (!data.companyName.trim()) errors.companyName = "Required";
      if (!data.cacNumber.trim()) errors.cacNumber = "Required";
      if (!data.asinNumber.trim()) errors.asinNumber = "Required";
      if (!data.contactPerson.trim()) errors.contactPerson = "Required";
      if (!data.contactPhone.trim()) errors.contactPhone = "Required";
      if (!data.contactEmail.trim()) errors.contactEmail = "Required";
      if (!data.cacDocumentId) errors.cacDocumentId = "Required";
      if (!data.landOwnershipDocId) errors.landOwnershipDocId = "Required";
      if (!data.corporateAsinDocumentId) errors.corporateAsinDocumentId = "Required";
    }

    // Step 3: Terminals & Managers
    if (step === 3) {
      // A terminal becomes a motor park on approval, so it is asked for the
      // same facility evidence a park is asked for.
      if (!data.toiletPhotoId) errors.toiletPhotoId = "Required";
      if (!data.waitingAreaPhotoId) errors.waitingAreaPhotoId = "Required";
      if (!data.signagePhotoId) errors.signagePhotoId = "Required";
      if (!data.waterFacilityPhotoId) errors.waterFacilityPhotoId = "Required";
      if (!data.cctvPhotoId) errors.cctvPhotoId = "Required";
      if (data.terminals.length === 0) {
        setStepErrors({ ...errors });
        return false;
      }
      // Validate each terminal (at least one terminal must be complete)
      let hasAtLeastOneValid = false;
      for (const terminal of data.terminals) {
        const terminalValid =
          terminal.locationAddress.trim() &&
          terminal.managerName.trim() &&
          terminal.managerPhone.trim() &&
          terminal.managerEmail.trim() &&
          terminal.managerResidentialAddress.trim();
        if (terminalValid) {
          hasAtLeastOneValid = true;
          break;
        }
      }
      if (!hasAtLeastOneValid) {
        errors.terminals = "At least one terminal with complete manager details is required";
      }
    }

    // Step 4: Vehicle Fleet
    if (step === 4) {
      const total = Object.values(data.vehicleTypeCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      if (total < 5) {
        errors.vehicleTypeCounts = "Total vehicles must be at least 5";
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNextStep() {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
      setStepErrors({});
    }
  }

  function handlePreviousStep() {
    setCurrentStep((prev) => prev - 1);
    setStepErrors({});
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(undefined);

    if (!validateStep(3)) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("companyName", data.companyName);
      fd.set("cacNumber", data.cacNumber);
      fd.set("asinNumber", data.asinNumber);
      fd.set("contactPerson", data.contactPerson);
      fd.set("contactPhone", data.contactPhone);
      fd.set("contactEmail", data.contactEmail);
      fd.set("cacDocumentId", data.cacDocumentId);
      fd.set("landOwnershipDocId", data.landOwnershipDocId);
      fd.set("corporateAsinDocumentId", data.corporateAsinDocumentId);
      fd.set("toiletPhotoId", data.toiletPhotoId);
      fd.set("waitingAreaPhotoId", data.waitingAreaPhotoId);
      fd.set("signagePhotoId", data.signagePhotoId);
      fd.set("waterFacilityPhotoId", data.waterFacilityPhotoId);
      fd.set("cctvPhotoId", data.cctvPhotoId);
      fd.set(
        "terminalsJson",
        JSON.stringify(
          data.terminals.map((t) => ({
            locationAddress: t.locationAddress,
            gpsCoordinates: t.gpsCoordinates,
            managerName: t.managerName,
            managerPhone: t.managerPhone,
            managerEmail: t.managerEmail,
            managerResidentialAddress: t.managerResidentialAddress,
          }))
        )
      );
      fd.set(
        "vehicleTypesJson",
        JSON.stringify(
          VEHICLE_TYPES.filter((vt) => data.vehicleTypeCounts[vt.value] > 0)
            .map((vt) => ({
              type: vt.value,
              count: data.vehicleTypeCounts[vt.value],
            }))
        )
      );

      const result: ActionResult<{ companyId: string }> =
        await submitFleetApplication(undefined, fd);
      if (result.success) {
        router.push(`/fleet-operators/${result.data!.companyId}`);
      } else {
        setGlobalError(result.error);
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <span>New Application</span>
        </nav>
        <h1 className="text-2xl font-semibold">
          Mass Transit Registration Application
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register your mass transit company and fleet with the Ministry of
          Transport.
        </p>
      </div>

      {/* Progress */}
      <StepProgress current={currentStep} completed={completedSteps} />

      {/* Global Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── STEP 1: Your Information ──────────────────────────────────────── */}
        {currentStep === 1 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  Pre-filled from your Ministry of Transport account
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground text-xs font-normal mb-1 block">
                    Full Name
                  </Label>
                  <div className="p-3 rounded-md border border-border bg-muted/50 text-foreground">
                    {ownerProfile ? (
                      `${ownerProfile.firstName || ""} ${ownerProfile.lastName || ""}`.trim()
                    ) : (
                      <span className="text-muted-foreground">Loading...</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs font-normal mb-1 block">
                    Email Address
                  </Label>
                  <div className="p-3 rounded-md border border-border bg-muted/50 text-foreground text-sm">
                    {ownerProfile?.email || (
                      <span className="text-muted-foreground">Loading...</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs font-normal mb-1 block">
                    Phone Number
                  </Label>
                  <div className="p-3 rounded-md border border-border bg-muted/50 text-foreground text-sm">
                    {ownerProfile?.phone || (
                      <span className="text-muted-foreground">Loading...</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground text-xs font-normal mb-1 block">
                    ASIN (Incorporation Number)
                  </Label>
                  <div className="p-3 rounded-md border border-border bg-muted/50 text-foreground">
                    {ownerProfile?.asinNumber || (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This information is from your account profile. To update it,{" "}
                <Link
                  href="/profile/edit"
                  className="underline hover:text-foreground">
                  edit your profile
                </Link>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* ── STEP 2: Company Details ────────────────────────────────────────── */}
        {currentStep === 2 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>
                  Information about your registered company
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field
                    id="companyName"
                    label="Company Name"
                    error={stepErrors.companyName}
                    required>
                    <Input
                      id="companyName"
                      value={data.companyName}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      placeholder="Registered company name"
                    />
                  </Field>
                </div>

                <Field
                  id="cacNumber"
                  label="CAC Registration Number"
                  error={stepErrors.cacNumber}
                  required>
                  <Input
                    id="cacNumber"
                    value={data.cacNumber}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        cacNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. RC:9428574"
                  />
                </Field>

                <Field
                  id="asinNumber"
                  label="ASIN Number"
                  error={stepErrors.asinNumber}
                  required>
                  <Input
                    id="asinNumber"
                    value={data.asinNumber}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        asinNumber: e.target.value,
                      }))
                    }
                    placeholder="16-digit ASIN"
                  />
                </Field>

                <Separator className="sm:col-span-2" />

                <div className="sm:col-span-2">
                  <Field
                    id="contactPerson"
                    label="Contact Person"
                    error={stepErrors.contactPerson}
                    required>
                    <Input
                      id="contactPerson"
                      value={data.contactPerson}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          contactPerson: e.target.value,
                        }))
                      }
                      placeholder="Full name of contact"
                    />
                  </Field>
                </div>

                <Field
                  id="contactPhone"
                  label="Contact Phone"
                  error={stepErrors.contactPhone}
                  required>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={data.contactPhone}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                    placeholder="e.g. 08012345678"
                  />
                </Field>

                <Field
                  id="contactEmail"
                  label="Contact Email"
                  error={stepErrors.contactEmail}
                  required>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                    placeholder="company@example.com"
                  />
                </Field>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Upload all required documentation for your fleet operator
                  application.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <FileUploadField
                  label="CAC Certificate"
                  hint="Certificate of Incorporation from the Corporate Affairs Commission."
                  documentName={data.cacDocumentName}
                  documentUrl={data.cacDocumentUrl}
                  uploading={uploadingCac}
                  error={cacError || stepErrors.cacDocumentId}
                  onSelect={handleCacUpload}
                  onClear={clearCacDocument}
                />

                <FileUploadField
                  label="Land Ownership / Lease Agreement"
                  hint="Proof of land ownership or valid lease agreement for the terminal/depot."
                  documentName={data.landOwnershipDocName}
                  documentUrl={data.landOwnershipDocUrl}
                  uploading={uploadingLand}
                  error={landError || stepErrors.landOwnershipDocId}
                  onSelect={handleLandUpload}
                  onClear={clearLandDocument}
                />

                <FileUploadField
                  label="Corporate ASIN Certificate"
                  hint="Your Corporate Anambra State Identity Number (ASIN) certificate."
                  documentName={data.corporateAsinDocumentName}
                  documentUrl={data.corporateAsinDocumentUrl}
                  uploading={uploadingAsin}
                  error={asinError || stepErrors.corporateAsinDocumentId}
                  onSelect={handleAsinUpload}
                  onClear={clearAsinDocument}
                />
              </CardContent>
            </Card>

            {/* Facility infrastructure — the same evidence a motor park
                provides, because an approved terminal becomes one. */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Facility Infrastructure Photos
                </CardTitle>
                <CardDescription>
                  Photographs of the terminal / depot facilities. These are
                  verified during the terminal inspection.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FileUploadField
                  label="Toilet Facilities Photo"
                  hint="Toilets available to passengers and staff."
                  documentName={data.toiletPhotoName}
                  documentUrl={data.toiletPhotoUrl}
                  uploading={uploadingToilet}
                  error={stepErrors.toiletPhotoId}
                  onSelect={handleToiletUpload}
                  onClear={clearToiletPhoto}
                />

                <FileUploadField
                  label="Passenger Waiting Area Photo"
                  hint="Sheltered waiting area at the terminal."
                  documentName={data.waitingAreaPhotoName}
                  documentUrl={data.waitingAreaPhotoUrl}
                  uploading={uploadingWaitingArea}
                  error={stepErrors.waitingAreaPhotoId}
                  onSelect={handleWaitingAreaUpload}
                  onClear={clearWaitingAreaPhoto}
                />

                <FileUploadField
                  label="Safety Signage Photo"
                  hint="Directional and safety signage on site."
                  documentName={data.signagePhotoName}
                  documentUrl={data.signagePhotoUrl}
                  uploading={uploadingSignage}
                  error={stepErrors.signagePhotoId}
                  onSelect={handleSignageUpload}
                  onClear={clearSignagePhoto}
                />

                <FileUploadField
                  label="Water Facility Photo"
                  hint="Borehole or dedicated water tank."
                  documentName={data.waterFacilityPhotoName}
                  documentUrl={data.waterFacilityPhotoUrl}
                  uploading={uploadingWaterFacility}
                  error={stepErrors.waterFacilityPhotoId}
                  onSelect={handleWaterFacilityUpload}
                  onClear={clearWaterFacilityPhoto}
                />

                <FileUploadField
                  label="Camera / CCTV Installation Photo"
                  hint="Cameras installed at the terminal and their coverage."
                  documentName={data.cctvPhotoName}
                  documentUrl={data.cctvPhotoUrl}
                  uploading={uploadingCctv}
                  error={stepErrors.cctvPhotoId}
                  onSelect={handleCctvUpload}
                  onClear={clearCctvPhoto}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* ── STEP 3: Terminal & Manager ────────────────────────────────────── */}
        {currentStep === 3 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Terminals & Managers</CardTitle>
                <CardDescription>
                  Add all your transit terminals and their respective managers
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Error message for terminals */}
            {stepErrors.terminals && (
              <Alert variant="destructive">
                <AlertDescription>{stepErrors.terminals}</AlertDescription>
              </Alert>
            )}

            {/* Terminals List */}
            <div className="flex flex-col gap-4">
              {data.terminals.map((terminal, idx) => (
                <Card key={terminal.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-base">
                        Terminal {idx + 1}
                      </CardTitle>
                      <CardDescription>
                        Location and manager information
                      </CardDescription>
                    </div>
                    {data.terminals.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setData((prev) => ({
                            ...prev,
                            terminals: prev.terminals.filter(
                              (t) => t.id !== terminal.id
                            ),
                          }));
                        }}
                        className="text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Field
                        id={`terminal-${terminal.id}-address`}
                        label="Terminal Location Address"
                        hint="Full address including LGA and state"
                        required>
                        <Input
                          id={`terminal-${terminal.id}-address`}
                          value={terminal.locationAddress}
                          onChange={(e) => {
                            setData((prev) => ({
                              ...prev,
                              terminals: prev.terminals.map((t) =>
                                t.id === terminal.id
                                  ? {
                                      ...t,
                                      locationAddress: e.target.value,
                                    }
                                  : t
                              ),
                            }));
                          }}
                          placeholder="Full terminal address"
                        />
                      </Field>
                    </div>

                    <Field
                      id={`terminal-${terminal.id}-gps`}
                      label="GPS Coordinates"
                      hint="e.g. 6.2088,6.9996"
                      required={false}>
                      <Input
                        id={`terminal-${terminal.id}-gps`}
                        value={terminal.gpsCoordinates}
                        onChange={(e) => {
                          setData((prev) => ({
                            ...prev,
                            terminals: prev.terminals.map((t) =>
                              t.id === terminal.id
                                ? {
                                    ...t,
                                    gpsCoordinates: e.target.value,
                                  }
                                : t
                            ),
                          }));
                        }}
                        placeholder="lat,lon"
                      />
                    </Field>

                    <Separator className="sm:col-span-2" />

                    <div className="sm:col-span-2">
                      <h3 className="font-semibold text-sm mb-4">
                        Manager Details
                      </h3>
                    </div>

                    <div className="sm:col-span-2">
                      <Field
                        id={`terminal-${terminal.id}-manager-name`}
                        label="Manager Full Name"
                        required>
                        <Input
                          id={`terminal-${terminal.id}-manager-name`}
                          value={terminal.managerName}
                          onChange={(e) => {
                            setData((prev) => ({
                              ...prev,
                              terminals: prev.terminals.map((t) =>
                                t.id === terminal.id
                                  ? {
                                      ...t,
                                      managerName: e.target.value,
                                    }
                                  : t
                              ),
                            }));
                          }}
                          placeholder="Full name"
                        />
                      </Field>
                    </div>

                    <Field
                      id={`terminal-${terminal.id}-manager-phone`}
                      label="Manager Phone"
                      required>
                      <Input
                        id={`terminal-${terminal.id}-manager-phone`}
                        type="tel"
                        value={terminal.managerPhone}
                        onChange={(e) => {
                          setData((prev) => ({
                            ...prev,
                            terminals: prev.terminals.map((t) =>
                              t.id === terminal.id
                                ? {
                                    ...t,
                                    managerPhone: e.target.value,
                                  }
                                : t
                            ),
                          }));
                        }}
                        placeholder="e.g. 08012345678"
                      />
                    </Field>

                    <Field
                      id={`terminal-${terminal.id}-manager-email`}
                      label="Manager Email"
                      required>
                      <Input
                        id={`terminal-${terminal.id}-manager-email`}
                        type="email"
                        value={terminal.managerEmail}
                        onChange={(e) => {
                          setData((prev) => ({
                            ...prev,
                            terminals: prev.terminals.map((t) =>
                              t.id === terminal.id
                                ? {
                                    ...t,
                                    managerEmail: e.target.value,
                                  }
                                : t
                            ),
                          }));
                        }}
                        placeholder="manager@example.com"
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field
                        id={`terminal-${terminal.id}-manager-address`}
                        label="Manager Residential Address"
                        required>
                        <Input
                          id={`terminal-${terminal.id}-manager-address`}
                          value={terminal.managerResidentialAddress}
                          onChange={(e) => {
                            setData((prev) => ({
                              ...prev,
                              terminals: prev.terminals.map((t) =>
                                t.id === terminal.id
                                  ? {
                                      ...t,
                                      managerResidentialAddress: e.target.value,
                                    }
                                  : t
                              ),
                            }));
                          }}
                          placeholder="Full residential address"
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add Terminal Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  terminals: [...prev.terminals, emptyTerminal()],
                }));
              }}>
              + Add Another Terminal
            </Button>
          </>
        )}

        {/* ── STEP 4: Vehicle Fleet ──────────────────────────────────────────── */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Fleet Declaration</CardTitle>
              <CardDescription>
                Declare how many vehicles of each type you are registering.
                Minimum 5 vehicles total required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stepErrors.vehicleTypeCounts && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {stepErrors.vehicleTypeCounts}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VEHICLE_TYPES.map((vt) => (
                  <Field
                    key={vt.value}
                    id={`count-${vt.value}`}
                    label={`Number of ${vt.label}s`}
                    required={false}>
                    <Input
                      id={`count-${vt.value}`}
                      type="number"
                      min="0"
                      value={data.vehicleTypeCounts[vt.value]}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          vehicleTypeCounts: {
                            ...prev.vehicleTypeCounts,
                            [vt.value]: Math.max(0, parseInt(e.target.value) || 0),
                          },
                        }))
                      }
                      placeholder="0"
                    />
                  </Field>
                ))}
              </div>

              <Separator />

              <div className="bg-accent/50 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Total Vehicles:{" "}
                  <span className="text-lg">
                    {Object.values(data.vehicleTypeCounts).reduce(
                      (sum, count) => sum + count,
                      0
                    )}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.values(data.vehicleTypeCounts).reduce(
                    (sum, count) => sum + count,
                    0
                  ) >= 5
                    ? "✓ Meets minimum requirement"
                    : "✗ Needs at least 5 vehicles"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              disabled={isPending}>
              Previous
            </Button>
          )}

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={isPending || uploadingCac || uploadingLand || uploadingAsin}>
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                isPending ||
                uploadingCac ||
                uploadingLand ||
                uploadingAsin ||
                Object.values(data.vehicleTypeCounts).reduce(
                  (sum, count) => sum + count,
                  0
                ) < 5
              }>
              {isPending ? "Submitting…" : "Submit Application"}
            </Button>
          )}

          <Button asChild variant="outline" disabled={isPending}>
            <Link href="/fleet-operators">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
