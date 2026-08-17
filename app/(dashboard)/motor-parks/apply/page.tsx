"use client";

/**
 * Motor Park Application - Multi-Step Wizard
 * STORY-021 | FR-010
 *
 * Steps:
 *   1. Business Details  (businessName, transportCompanyName, cacRegistrationNumber, anssidNumber)
 *   2. Park Location     (locationAddress, gpsCoordinates)
 *   3. Park Manager      (contactPerson, contactPhone, contactEmail)
 *   4. Documents         (CAC certificate upload - optional)
 *
 * Progress persisted to localStorage so applicants can resume after closing the tab.
 */

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { submitParkApplication } from "@/app/actions/motor-park";
import { uploadCacDocument } from "@/app/actions/upload";
import { getMyProfile, type UserProfile } from "@/app/actions/auth";
import {
  loadParkDraft,
  saveParkDraft,
  clearParkDraft,
} from "@/app/actions/motor-park-draft";
import type { DraftData } from "@/app/actions/motor-park-draft";
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
import { CheckCircle2, Upload, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// -- Types -------------------------------------------------------------------

type WizardData = DraftData;

type StepErrors = Partial<Record<keyof WizardData, string>>;

const EMPTY: WizardData = {
  businessName: "",
  transportCompanyName: "",
  cacRegistrationNumber: "",
  anssidNumber: "",
  streetAddress: "",
  lga: "",
  townCity: "",
  gpsCoordinates: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  managerStreetAddress: "",
  managerLga: "",
  managerTownCity: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
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
};

// -- Step config -------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Owner Details" },
  { id: 2, label: "Business Details" },
  { id: 3, label: "Park Location" },
  { id: 4, label: "Park Manager" },
  { id: 5, label: "Documents" },
];

// -- Helpers -----------------------------------------------------------------

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
  required,
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
        {!required && (
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

// -- Step progress bar -------------------------------------------------------

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

// -- File upload widget ------------------------------------------------------

function FileUploadField({
  label,
  hint,
  required,
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
      <Label>{label}</Label>
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

// -- Main page ---------------------------------------------------------------

export default function ApplyMotorParkPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [data, setData] = useState<WizardData>(EMPTY);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [submitted, setSubmitted] = useState<{ parkId: string } | null>(null);
  const [uploadingCac, setUploadingCac] = useState(false);
  const [uploadingLand, setUploadingLand] = useState(false);
  const [uploadingAsin, setUploadingAsin] = useState(false);
  const [uploadingToilet, setUploadingToilet] = useState(false);
  const [uploadingWaitingArea, setUploadingWaitingArea] = useState(false);
  const [uploadingSignage, setUploadingSignage] = useState(false);
  const [uploadingWaterFacility, setUploadingWaterFacility] = useState(false);
  const [uploadingCctv, setUploadingCctv] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);

  // Load draft from DB on mount (falls back to empty state)
  useEffect(() => {
    Promise.all([loadParkDraft(), getMyProfile()])
      .then(([draft, profileResult]) => {
        if (draft) {
          setData(draft.data);
          setCurrentStep(draft.stepReached);
          const done = new Set<number>();
          for (let i = 1; i < draft.stepReached; i++) done.add(i);
          setCompletedSteps(done);
        }
        if (profileResult.success) {
          setOwnerProfile(profileResult.data as UserProfile);
        }
      })
      .catch(() => {
        /* ignore — user stays at step 1 */
      })
      .finally(() => setDraftLoading(false));
  }, []);

  const set = (field: keyof WizardData, value: string) =>
    setData((prev) => ({ ...prev, [field]: value }));

  // Per-step validation
  function validateStep(step: number): StepErrors {
    const e: StepErrors = {};
    if (step === 2) {
      if (!data.businessName.trim())
        e.businessName = "Business / Park name is required";
      else if (data.businessName.trim().length < 3)
        e.businessName = "Must be at least 3 characters";
      if (!data.anssidNumber.trim())
        e.anssidNumber = "ANSSID number is required";
    }
    if (step === 3) {
      if (!data.streetAddress.trim())
        e.streetAddress = "Street address is required";
      else if (data.streetAddress.trim().length < 5)
        e.streetAddress = "Must be at least 5 characters";
      if (!data.lga.trim()) e.lga = "LGA is required";
      if (!data.townCity.trim()) e.townCity = "Town/City is required";
      if (
        data.gpsCoordinates &&
        !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(data.gpsCoordinates.trim())
      )
        e.gpsCoordinates = "Must be in lat,lon format - e.g. 6.2088, 7.0676";
    }
    if (step === 4) {
      if (!data.contactPerson.trim())
        e.contactPerson = "Manager name is required";
      if (!data.contactPhone.trim())
        e.contactPhone = "Phone number is required";
      else if (!/^(\+234|0)[0-9]{10}$/.test(data.contactPhone.trim()))
        e.contactPhone = "Enter a valid Nigerian phone number";
      if (!data.contactEmail.trim())
        e.contactEmail = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))
        e.contactEmail = "Enter a valid email address";
      
      if (!data.managerStreetAddress.trim()) e.managerStreetAddress = "Street address is required";
      if (!data.managerLga.trim()) e.managerLga = "LGA is required";
      if (!data.managerTownCity.trim()) e.managerTownCity = "Town/City is required";

      if (data.nextOfKinPhone && !/^(\+234|0)[0-9]{10}$/.test(data.nextOfKinPhone.trim())) {
        e.nextOfKinPhone = "Enter a valid Nigerian phone number";
      }
    }
    if (step === 5) {
      if (!data.cacDocumentId) e.cacDocumentId = "CAC Registration Certificate is required";
      if (!data.landOwnershipDocId) e.landOwnershipDocId = "Land Ownership/Lease Agreement is required";
      if (!data.toiletPhotoId) e.toiletPhotoId = "Toilet/convenience photo is required";
      if (!data.waitingAreaPhotoId) e.waitingAreaPhotoId = "Waiting lounge photo is required";
      if (!data.signagePhotoId) e.signagePhotoId = "Signage photo is required";
      if (!data.waterFacilityPhotoId) e.waterFacilityPhotoId = "Water facility/borehole photo is required";
      if (!data.cctvPhotoId) e.cctvPhotoId = "Camera installation photo is required";
    }
    return e;
  }

  function handleNext() {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const nextStep = currentStep + 1;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep(nextStep);
    // Auto-save to DB so progress survives logout
    saveParkDraft(nextStep, data).catch(() => {
      /* best-effort */
    });
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((s) => s - 1);
  }

  async function handleCacUpload(file: File) {
    setUploadingCac(true);
    setErrors((prev) => ({ ...prev, cacDocumentId: undefined }));
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
      setErrors((prev) => ({ ...prev, cacDocumentId: result.error }));
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
    setErrors((prev) => ({ ...prev, landOwnershipDocId: undefined }));
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
      setErrors((prev) => ({ ...prev, landOwnershipDocId: result.error }));
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
    setErrors((prev) => ({ ...prev, corporateAsinDocumentId: undefined }));
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
      setErrors((prev) => ({ ...prev, corporateAsinDocumentId: result.error }));
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

  async function handleToiletUpload(file: File) {
    setUploadingToilet(true);
    setErrors((prev) => ({ ...prev, toiletPhotoId: undefined }));
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
    } else {
      setErrors((prev) => ({ ...prev, toiletPhotoId: result.error }));
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

  async function handleWaitingAreaUpload(file: File) {
    setUploadingWaitingArea(true);
    setErrors((prev) => ({ ...prev, waitingAreaPhotoId: undefined }));
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
    } else {
      setErrors((prev) => ({ ...prev, waitingAreaPhotoId: result.error }));
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

  async function handleSignageUpload(file: File) {
    setUploadingSignage(true);
    setErrors((prev) => ({ ...prev, signagePhotoId: undefined }));
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
    } else {
      setErrors((prev) => ({ ...prev, signagePhotoId: result.error }));
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

  async function handleWaterFacilityUpload(file: File) {
    setUploadingWaterFacility(true);
    setErrors((prev) => ({ ...prev, waterFacilityPhotoId: undefined }));
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
    } else {
      setErrors((prev) => ({ ...prev, waterFacilityPhotoId: result.error }));
    }
    setUploadingWaterFacility(false);
  }

  async function handleCctvUpload(file: File) {
    setUploadingCctv(true);
    setErrors((prev) => ({ ...prev, cctvPhotoId: undefined }));
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
    } else {
      setErrors((prev) => ({ ...prev, cctvPhotoId: result.error }));
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

  function clearWaterFacilityPhoto() {
    setData((prev) => ({
      ...prev,
      waterFacilityPhotoId: "",
      waterFacilityPhotoUrl: "",
      waterFacilityPhotoName: "",
    }));
  }

  function handleSubmit() {
    setSubmitError(null);
    const fd = new globalThis.FormData();
    fd.append("businessName", data.businessName);
    if (data.transportCompanyName)
      fd.append("transportCompanyName", data.transportCompanyName);
    if (data.cacRegistrationNumber)
      fd.append("cacRegistrationNumber", data.cacRegistrationNumber);
    fd.append("anssidNumber", data.anssidNumber);
    fd.append("streetAddress", data.streetAddress);
    fd.append("lga", data.lga);
    fd.append("townCity", data.townCity);
    if (data.gpsCoordinates) fd.append("gpsCoordinates", data.gpsCoordinates);
    fd.append("contactPerson", data.contactPerson);
    fd.append("contactPhone", data.contactPhone);
    fd.append("contactEmail", data.contactEmail);
    
    const combinedManagerAddress = [data.managerStreetAddress, data.managerLga, data.managerTownCity]
      .filter(Boolean)
      .join(", ");
    if (combinedManagerAddress) fd.append("managerResidentialAddress", combinedManagerAddress);
    if (data.nextOfKinName) fd.append("nextOfKinName", data.nextOfKinName);
    if (data.nextOfKinPhone) fd.append("nextOfKinPhone", data.nextOfKinPhone);

    fd.append("cacDocumentId", data.cacDocumentId);
    fd.append("landOwnershipDocId", data.landOwnershipDocId);
    fd.append("corporateAsinDocumentId", data.corporateAsinDocumentId);
    fd.append("toiletPhotoId", data.toiletPhotoId);
    fd.append("waitingAreaPhotoId", data.waitingAreaPhotoId);
    fd.append("signagePhotoId", data.signagePhotoId);
    fd.append("waterFacilityPhotoId", data.waterFacilityPhotoId);
    fd.append("cctvPhotoId", data.cctvPhotoId);

    startSubmit(async () => {
      const result = await submitParkApplication(undefined as never, fd);
      if (result?.success) {
        clearParkDraft().catch(() => {
          /* best-effort */
        });
        setSubmitted({ parkId: result.data?.parkId ?? "" });
      } else {
        setSubmitError(result?.error ?? "Submission failed. Please try again.");
      }
    });
  }

  // Show minimal skeleton while loading saved draft from DB
  if (draftLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
        <div className="h-4 w-96 rounded bg-muted animate-pulse" />
        <div className="h-12 w-full rounded bg-muted animate-pulse" />
        <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="grid place-content-center w-10 h-10 rounded-full bg-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <CardTitle
                className="text-xl"
                style={{ fontFamily: "var(--font-display)" }}>
                Application Submitted
              </CardTitle>
            </div>
            <CardDescription>
              Your motor park application has been received and routed to the
              Parks Inspection Team.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              You will be notified by email when an inspection date is
              scheduled. Track your application status from the Motor Parks
              dashboard.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/motor-parks">View My Applications</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <span className="text-foreground">New Application</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Motor Park Application
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete all required fields. Your progress is saved automatically -
          you can resume any time.
        </p>
      </div>

      {/* Step progress */}
      <StepProgress current={currentStep} completed={completedSteps} />

      {/* -- Step 1: Owner Details -- */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner Details</CardTitle>
            <CardDescription>
              These are your registered account details. Update them from your profile settings before applying if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="ownerFirstName" label="First Name" required>
                <Input value={ownerProfile?.firstName || ""} disabled />
              </Field>
              <Field id="ownerLastName" label="Last Name" required>
                <Input value={ownerProfile?.lastName || ""} disabled />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="ownerEmail" label="Email Address" required>
                <Input value={ownerProfile?.email || ""} disabled />
              </Field>
              <Field id="ownerPhone" label="Phone Number" required>
                <Input value={ownerProfile?.phone || ""} disabled />
              </Field>
            </div>
            <Field id="ownerAddress" label="Residential Address" required>
              <Input value={ownerProfile?.residentialAddress || ""} disabled />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* -- Step 2: Business Details -- */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Details</CardTitle>
            <CardDescription>
              Information about the park owner and registered business.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              id="businessName"
              label="Business / Park Name"
              required
              error={errors.businessName}>
              <Input
                id="businessName"
                value={data.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                placeholder="e.g. Awka Central Motor Park"
                className={errors.businessName ? "border-destructive" : ""}
              />
            </Field>

            <Field
              id="transportCompanyName"
              label="Transport Company Name"
              hint="If operating under a registered transport company.">
              <Input
                id="transportCompanyName"
                value={data.transportCompanyName}
                onChange={(e) => set("transportCompanyName", e.target.value)}
                placeholder="e.g. Anambra Express Ltd"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="cacRegistrationNumber"
                label="CAC Registration Number"
                hint="From your Certificate of Incorporation."
                error={errors.cacRegistrationNumber}>
                <Input
                  id="cacRegistrationNumber"
                  value={data.cacRegistrationNumber}
                  onChange={(e) => set("cacRegistrationNumber", e.target.value)}
                  placeholder="e.g. RC 1234567"
                  className={
                    errors.cacRegistrationNumber ? "border-destructive" : ""
                  }
                />
              </Field>

              <Field
                id="anssidNumber"
                label="Company ANSSID Number"
                required
                hint="Anambra State Social Insurance & Dev. number."
                error={errors.anssidNumber}>
                <Input
                  id="anssidNumber"
                  value={data.anssidNumber}
                  onChange={(e) => set("anssidNumber", e.target.value)}
                  placeholder="1234567890123456"
                  className={errors.anssidNumber ? "border-destructive" : ""}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -- Step 3: Park Location -- */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Park Location</CardTitle>
            <CardDescription>
              Physical location of the proposed motor park site.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              id="streetAddress"
              label="Street Address"
              required
              error={errors.streetAddress}>
              <Input
                id="streetAddress"
                value={data.streetAddress}
                onChange={(e) => set("streetAddress", e.target.value)}
                placeholder="e.g. 12 Zik Avenue"
                className={errors.streetAddress ? "border-destructive" : ""}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="lga" label="LGA" required error={errors.lga}>
                <Input
                  id="lga"
                  value={data.lga}
                  onChange={(e) => set("lga", e.target.value)}
                  placeholder="e.g. Awka South"
                  className={errors.lga ? "border-destructive" : ""}
                />
              </Field>
              <Field id="townCity" label="Town / City" required error={errors.townCity}>
                <Input
                  id="townCity"
                  value={data.townCity}
                  onChange={(e) => set("townCity", e.target.value)}
                  placeholder="e.g. Awka"
                  className={errors.townCity ? "border-destructive" : ""}
                />
              </Field>
            </div>

            <Field
              id="gpsCoordinates"
              label="GPS Coordinates"
              hint="Latitude, Longitude - e.g. 6.2088, 7.0676"
              error={errors.gpsCoordinates}>
              <Input
                id="gpsCoordinates"
                value={data.gpsCoordinates}
                onChange={(e) => set("gpsCoordinates", e.target.value)}
                placeholder="6.2088, 7.0676"
                className={errors.gpsCoordinates ? "border-destructive" : ""}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* -- Step 4: Park Manager -- */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Park Manager Contact</CardTitle>
            <CardDescription>
              Primary contact for inspection scheduling and correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              id="contactPerson"
              label="Manager / Contact Name"
              required
              error={errors.contactPerson}>
              <Input
                id="contactPerson"
                value={data.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                placeholder="Full name of park manager"
                autoComplete="name"
                className={errors.contactPerson ? "border-destructive" : ""}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="contactPhone"
                label="Phone Number"
                required
                error={errors.contactPhone}>
                <Input
                  id="contactPhone"
                  value={data.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder="08012345678"
                  type="tel"
                  autoComplete="tel"
                  className={errors.contactPhone ? "border-destructive" : ""}
                />
              </Field>

              <Field
                id="contactEmail"
                label="Email Address"
                required
                error={errors.contactEmail}>
                <Input
                  id="contactEmail"
                  value={data.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="manager@example.com"
                  type="email"
                  autoComplete="email"
                  className={errors.contactEmail ? "border-destructive" : ""}
                />
              </Field>
            </div>
            
            {/* Manager Residential Address */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Manager Residential Address</h3>
              <div className="flex flex-col gap-4">
                <Field
                  id="managerStreetAddress"
                  label="Manager Street Address"
                  required
                  error={errors.managerStreetAddress}>
                  <Input
                    id="managerStreetAddress"
                    value={data.managerStreetAddress}
                    onChange={(e) => set("managerStreetAddress", e.target.value)}
                    placeholder="e.g. 15 Enugu Road"
                    className={errors.managerStreetAddress ? "border-destructive" : ""}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="managerLga" label="Manager LGA" required error={errors.managerLga}>
                    <Input
                      id="managerLga"
                      value={data.managerLga}
                      onChange={(e) => set("managerLga", e.target.value)}
                      placeholder="e.g. Awka South"
                      className={errors.managerLga ? "border-destructive" : ""}
                    />
                  </Field>
                  <Field id="managerTownCity" label="Manager Town / City" required error={errors.managerTownCity}>
                    <Input
                      id="managerTownCity"
                      value={data.managerTownCity}
                      onChange={(e) => set("managerTownCity", e.target.value)}
                      placeholder="e.g. Awka"
                      className={errors.managerTownCity ? "border-destructive" : ""}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Next of Kin */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Next of Kin <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="nextOfKinName" label="Next of Kin Name" error={errors.nextOfKinName}>
                  <Input
                    id="nextOfKinName"
                    value={data.nextOfKinName}
                    onChange={(e) => set("nextOfKinName", e.target.value)}
                    placeholder="Full name"
                  />
                </Field>
                <Field id="nextOfKinPhone" label="Next of Kin Phone" error={errors.nextOfKinPhone}>
                  <Input
                    id="nextOfKinPhone"
                    value={data.nextOfKinPhone}
                    onChange={(e) => set("nextOfKinPhone", e.target.value)}
                    placeholder="08012345678"
                    type="tel"
                    className={errors.nextOfKinPhone ? "border-destructive" : ""}
                  />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -- Step 5: Documents -- */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents & Facility Infrastructure Photos</CardTitle>
            <CardDescription>
              Upload all required documentation and facility pictures to verify compliance with site standards.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Required Documents</h3>
              <div className="grid grid-cols-1 gap-6">
                <FileUploadField
                  label="CAC Certificate"
                  hint="Certificate of Incorporation from the Corporate Affairs Commission."
                  required
                  documentName={data.cacDocumentName}
                  documentUrl={data.cacDocumentUrl}
                  uploading={uploadingCac}
                  error={errors.cacDocumentId}
                  onSelect={handleCacUpload}
                  onClear={clearCacDocument}
                />

                <FileUploadField
                  label="Land Ownership / Lease Agreement"
                  hint="Proof of land ownership or valid lease agreement for the proposed park site."
                  required
                  documentName={data.landOwnershipDocName}
                  documentUrl={data.landOwnershipDocUrl}
                  uploading={uploadingLand}
                  error={errors.landOwnershipDocId}
                  onSelect={handleLandUpload}
                  onClear={clearLandDocument}
                />

                <FileUploadField
                  label="Corporate ASIN Certificate"
                  hint="Your Corporate Anambra State Identity Number (ASIN) certificate."
                  required
                  documentName={data.corporateAsinDocumentName}
                  documentUrl={data.corporateAsinDocumentUrl}
                  uploading={uploadingAsin}
                  error={errors.corporateAsinDocumentId}
                  onSelect={handleAsinUpload}
                  onClear={clearAsinDocument}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Facility Infrastructure Photos</h3>
                <p className="text-xs text-muted-foreground">
                  Provide evidence of compliance with Anambra State Ministry of Transport Site Standards for Approval.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FileUploadField
                  label="Toilet/Convenience Photo"
                  hint="Separate male/female Urinals & Toilets."
                  required
                  documentName={data.toiletPhotoName}
                  documentUrl={data.toiletPhotoUrl}
                  uploading={uploadingToilet}
                  error={errors.toiletPhotoId}
                  onSelect={handleToiletUpload}
                  onClear={clearToiletPhoto}
                />

                <FileUploadField
                  label="Waiting Area / Lounge Photo"
                  hint="Waiting lounge with seats and/or ticketing office."
                  required
                  documentName={data.waitingAreaPhotoName}
                  documentUrl={data.waitingAreaPhotoUrl}
                  uploading={uploadingWaitingArea}
                  error={errors.waitingAreaPhotoId}
                  onSelect={handleWaitingAreaUpload}
                  onClear={clearWaitingAreaPhoto}
                />

                <FileUploadField
                  label="Signage Photo"
                  hint="Entrance and/or exit signage showing the park name."
                  required
                  documentName={data.signagePhotoName}
                  documentUrl={data.signagePhotoUrl}
                  uploading={uploadingSignage}
                  error={errors.signagePhotoId}
                  onSelect={handleSignageUpload}
                  onClear={clearSignagePhoto}
                />

                <FileUploadField
                  label="Water Facility Photo"
                  hint="Borehole or dedicated water tank facility."
                  required
                  documentName={data.waterFacilityPhotoName}
                  documentUrl={data.waterFacilityPhotoUrl}
                  uploading={uploadingWaterFacility}
                  error={errors.waterFacilityPhotoId}
                  onSelect={handleWaterFacilityUpload}
                  onClear={clearWaterFacilityPhoto}
                />

                {/* Cameras are now asked for on both the motor park and the
                    mass transit application, and verified at inspection. */}
                <FileUploadField
                  label="Camera / CCTV Installation Photo"
                  hint="Show the cameras installed in the park and their coverage."
                  required
                  documentName={data.cctvPhotoName}
                  documentUrl={data.cctvPhotoUrl}
                  uploading={uploadingCctv}
                  error={errors.cctvPhotoId}
                  onSelect={handleCctvUpload}
                  onClear={clearCctvPhoto}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global submit error */}
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/motor-parks">Cancel</Link>
          </Button>
        )}

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>Continue</Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              uploadingCac ||
              uploadingLand ||
              uploadingAsin ||
              uploadingToilet ||
              uploadingWaitingArea ||
              uploadingSignage ||
              uploadingWaterFacility ||
              uploadingCctv
            }
            aria-busy={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
