"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  submitRevalidationApplication,
  getExistingParkForRevalidation,
} from "@/app/actions/revalidation";
import { uploadCacDocument } from "@/app/actions/upload";
import { getMyProfile, type UserProfile } from "@/app/actions/auth";
import {
  loadRevalidationDraft,
  saveRevalidationDraft,
} from "@/app/actions/revalidation-draft";
import type { RevalidationDraftData } from "@/app/actions/revalidation-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Upload, X, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { FACILITY_ITEMS } from "@/lib/facilities";

const EMPTY: RevalidationDraftData = {
  ownerName: "",
  ownershipType: "Individual",
  cacRegistrationNumber: "",
  representativeName: "",
  designation: "",
  phoneNumber: "",
  alternatePhoneNumber: "",
  emailAddress: "",
  residentialAddress: "",
  asinNumber: "",
  nin: "",
  tin: "",
  parkName: "",
  facilityType: "Public",
  facilitySubTypes: [],
  physicalLocation: "",
  townCommunity: "",
  lga: "",
  yearEstablished: "",
  operationalStatus: "Fully Operational",
  dailyVehiclesCount: "21–50",
  vehicleTypes: [],
  vehicleTypesOther: "",
  facilitiesAvailable: {},
  existingApprovalNum: "",
  maintainsManifest: false,
  operatorsRegistered: false,
  paymentsUpToDate: false,
  safetySignages: false,
  pendingSanctions: false,
  sanctionDetails: "",
  managementStaffCount: "0",
  adminStaffCount: "0",
  securityStaffCount: "0",
  otherStaffCount: "0",
  otherStaffDetails: "",
  securityArrangement: "None",
  estimatedDailyRevenue: "0",
  estimatedMonthlyRev: "0",
  revenueCollectionMethod: "Cash",
  passportPhotoId: "",
  passportPhotoUrl: "",
  passportPhotoName: "",
};

const STEPS = [
  { id: 1, label: "Applicant Details" },
  { id: 2, label: "Park & Operations" },
  { id: 3, label: "Compliance & Staff" },
  { id: 4, label: "Revenue & Photo" },
];

const PUBLIC_PRIVATE_OPTIONS = ["Inter-State", "Intra-State", "Both", "Keke", "Buses", "Luxury Bus"];
const LOADING_BAY_OPTIONS = ["Motorcycle", "Cargo", "Logistics"];
const VEHICLE_TYPES = ["Motorcycle", "Tricycle", "Taxi", "Shuttle Bus", "Mini Bus", "Luxury Bus", "Truck", "Tipper", "Tanker", "Haulage Vehicle", "Others"];
// Shared with the mass transit application — see lib/facilities.ts.
const FACILITIES = FACILITY_ITEMS;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function Field({ id, label, required, error, children }: { id?: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <Label htmlFor={id}>
        {label}
        {!required && <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export default function ApplyRevalidationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId");
  const assetType = searchParams.get("assetType");

  const [data, setData] = useState<RevalidationDraftData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof RevalidationDraftData, string>>>({});
  const [submitting, startSubmit] = useTransition();
  const [submitted, setSubmitted] = useState<{ applicationId: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      loadRevalidationDraft(),
      getMyProfile(),
      getExistingParkForRevalidation(
        assetId && (assetType === "MOTOR_PARK" || assetType === "MASS_TRANSIT")
          ? { kind: assetType, id: assetId }
          : undefined,
      ),
    ])
      .then(([draft, profileResult, existingPark]) => {
        // An asset picked from the due list is an explicit choice, so it
        // takes precedence over whatever half-finished draft was left behind.
        if (draft && !assetId) {
          setData(draft.data);
          setCurrentStep(draft.stepReached);
          const done = new Set<number>();
          for (let i = 1; i < draft.stepReached; i++) done.add(i);
          setCompletedSteps(done);
        } else if (existingPark) {
          // The profile is the floor and the record is the ceiling: anything
          // the park or the last revalidation knows wins, anything it does
          // not is filled from the account. Previously this was an either/or,
          // so a designation or NIN held on the profile was left blank
          // whenever a park was found.
          const prof = profileResult.success
            ? (profileResult.data as UserProfile)
            : null;

          setData((prev) => ({
            ...prev,
            motorParkId: existingPark.id,
            ownershipType: existingPark.ownershipType || prev.ownershipType,
            designation:
              existingPark.designation || prof?.designation || prev.designation,
            alternatePhoneNumber:
              existingPark.alternatePhoneNumber || prev.alternatePhoneNumber,
            nin: existingPark.nin || prev.nin,
            tin: existingPark.tin || prev.tin,
            parkName: existingPark.parkName || prev.parkName,
            ownerName: existingPark.ownerName || prev.ownerName,
            representativeName:
              existingPark.representativeName ||
              existingPark.ownerName ||
              prev.representativeName,
            phoneNumber:
              existingPark.phoneNumber || prof?.phone || prev.phoneNumber,
            emailAddress:
              existingPark.emailAddress || prof?.email || prev.emailAddress,
            residentialAddress:
              existingPark.residentialAddress ||
              prof?.residentialAddress ||
              prev.residentialAddress,
            asinNumber:
              existingPark.asinNumber || prof?.asinNumber || prev.asinNumber,
            physicalLocation: existingPark.physicalLocation || prev.physicalLocation,
            townCommunity: existingPark.townCommunity || prev.townCommunity,
            lga: existingPark.lga || prev.lga,
            existingApprovalNum: existingPark.existingApprovalNum || prev.existingApprovalNum,
            cacRegistrationNumber: existingPark.cacRegistrationNumber || prev.cacRegistrationNumber,
          }));
        } else if (profileResult.success) {
          const p = profileResult.data as UserProfile;
          setData((prev) => ({
            ...prev,
            ownerName: `${p.firstName} ${p.lastName}`,
            emailAddress: p.email ?? "",
            phoneNumber: p.phone || "",
            asinNumber: p.asinNumber || "",
            residentialAddress: p.residentialAddress || "",
          }));
        }
      })
      .finally(() => setDraftLoading(false));
    // Runs once on mount; the chosen asset comes from the URL and does not
    // change while the form is open.
  }, [assetId, assetType]);

  const setField = (field: keyof RevalidationDraftData, value: any) => setData((prev) => ({ ...prev, [field]: value }));

  function toggleArrayItem(field: keyof RevalidationDraftData, item: string) {
    setData((prev) => {
      const arr = (prev[field] as string[]) || [];
      return { ...prev, [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });
  }

  function toggleFacility(facility: string, value: boolean) {
    setData((prev) => ({
      ...prev,
      facilitiesAvailable: { ...prev.facilitiesAvailable, [facility]: value }
    }));
  }

  function validateStep(step: number) {
    const e: Partial<Record<keyof RevalidationDraftData, string>> = {};
    if (step === 1) {
      if (!data.ownerName) e.ownerName = "Required";
      if (!data.representativeName) e.representativeName = "Required";
      if (!data.designation) e.designation = "Required";
      if (!data.phoneNumber) e.phoneNumber = "Required";
      if (!data.emailAddress) e.emailAddress = "Required";
      if (!data.residentialAddress) e.residentialAddress = "Required";
      if (!data.asinNumber) e.asinNumber = "Required";
      // ASIN is the state's own identifier and is already required above, so
      // an operator who has one is not blocked for want of an NIN.
      if (!data.nin && !data.asinNumber) e.nin = "Required";
    } else if (step === 2) {
      if (!data.parkName) e.parkName = "Required";
      if (!data.physicalLocation) e.physicalLocation = "Required";
      if (!data.townCommunity) e.townCommunity = "Required";
      if (!data.lga) e.lga = "Required";
      if (!data.yearEstablished) e.yearEstablished = "Required";
      if (data.vehicleTypes.length === 0) e.vehicleTypes = "Select at least one";
    } else if (step === 3) {
      if (data.pendingSanctions && !data.sanctionDetails) e.sanctionDetails = "Required if pending sanctions";
      if (parseInt(data.otherStaffCount) > 0 && !data.otherStaffDetails) e.otherStaffDetails = "Please specify other staff";
    } else if (step === 4) {
      if (!data.estimatedDailyRevenue) e.estimatedDailyRevenue = "Required";
      if (!data.estimatedMonthlyRev) e.estimatedMonthlyRev = "Required";
      if (!data.passportPhotoId) e.passportPhotoId = "Passport photo is required";
    }
    return e;
  }

  function handleNext() {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields.");
      return;
    }
    setErrors({});
    const nextStep = currentStep + 1;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep(nextStep);
    saveRevalidationDraft(nextStep, data).catch(() => {});
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((s) => s - 1);
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    setErrors((prev) => ({ ...prev, passportPhotoId: undefined }));
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadCacDocument(fd);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        passportPhotoId: result.documentId,
        passportPhotoUrl: result.url,
        passportPhotoName: file.name,
      }));
    } else {
      setErrors((prev) => ({ ...prev, passportPhotoId: result.error }));
    }
    setUploadingPhoto(false);
  }

  function handleSubmit() {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields.");
      return;
    }
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "facilitiesAvailable" || key === "facilitySubTypes" || key === "vehicleTypes") {
        fd.append(key, JSON.stringify(value));
      } else {
        fd.append(key, String(value));
      }
    });

    startSubmit(async () => {
      const result = await submitRevalidationApplication(undefined as never, fd);
      if (result.success) {
        toast.success("Application submitted successfully!");
        setSubmitted({ applicationId: result.data!.applicationId });
      } else {
        toast.error(result.error || "Submission failed.");
      }
    });
  }

  if (draftLoading) return <div className="animate-pulse flex flex-col gap-4 max-w-xl"><div className="h-8 bg-muted rounded w-1/3"/><div className="h-64 bg-muted rounded"/></div>;

  if (submitted) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="grid place-content-center w-10 h-10 rounded-full bg-primary/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Application Submitted</CardTitle>
          </div>
          <CardDescription>Your revalidation form has been received.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button asChild><Link href="/revalidation">View Applications</Link></Button>
            <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const facilitySubOptions = data.facilityType === "Loading Bay" ? LOADING_BAY_OPTIONS : PUBLIC_PRIVATE_OPTIONS;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span>/</span>
          <Link href="/revalidation" className="hover:text-foreground">Revalidation</Link>
          <span>/</span>
          <span className="text-foreground">Apply</span>
        </nav>
        <h1 className="text-2xl font-bold">Motor Park Revalidation (2026/2027)</h1>
      </div>

      {data.motorParkId && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-amber-950 dark:text-amber-100">Revalidating Existing Park: </span>
              <span className="font-medium">{data.parkName}</span>
              {data.existingApprovalNum && (
                <span className="ml-1 text-muted-foreground font-mono">({data.existingApprovalNum})</span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10 flex-shrink-0">
            Existing Record Pre-filled
          </Badge>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm font-medium flex-wrap">
        {STEPS.map((step) => (
          <span key={step.id} className={currentStep === step.id ? "text-primary" : completedSteps.has(step.id) ? "text-primary/70" : "text-muted-foreground"}>
            {step.id}. {step.label}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS.find(s => s.id === currentStep)?.label}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          
          {currentStep === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <h3 className="font-semibold border-b pb-2 mb-2">Section A: Applicant Details</h3>
              </div>
              <Field id="ownerName" label="Name of Owner/Company" required error={errors.ownerName}>
                <Input value={data.ownerName} onChange={(e) => setField("ownerName", e.target.value)} />
              </Field>
              <Field id="ownershipType" label="Type of Ownership" required>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.ownershipType} onChange={(e) => setField("ownershipType", e.target.value)}>
                  {["Individual", "Registered Company", "Cooperative Society", "Transport Union", "Community Organization", "Government"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="cacRegistrationNumber" label="CAC Number">
                <Input value={data.cacRegistrationNumber} onChange={(e) => setField("cacRegistrationNumber", e.target.value)} />
              </Field>
              <Field id="representativeName" label="Rep Name" required error={errors.representativeName}>
                <Input value={data.representativeName} onChange={(e) => setField("representativeName", e.target.value)} />
              </Field>
              <Field id="designation" label="Designation" required error={errors.designation}>
                <Input value={data.designation} onChange={(e) => setField("designation", e.target.value)} />
              </Field>
              <Field id="phoneNumber" label="Phone Number" required error={errors.phoneNumber}>
                <Input value={data.phoneNumber} onChange={(e) => setField("phoneNumber", e.target.value)} />
              </Field>
              <Field id="alternatePhoneNumber" label="Alternate Phone Number">
                <Input value={data.alternatePhoneNumber} onChange={(e) => setField("alternatePhoneNumber", e.target.value)} />
              </Field>
              <Field id="emailAddress" label="Email Address" required error={errors.emailAddress}>
                <Input value={data.emailAddress} onChange={(e) => setField("emailAddress", e.target.value)} />
              </Field>
              <Field id="residentialAddress" label="Residential/Business Address" required error={errors.residentialAddress}>
                <Input value={data.residentialAddress} onChange={(e) => setField("residentialAddress", e.target.value)} />
              </Field>

              <div className="col-span-1 sm:col-span-2 mt-4">
                <h3 className="font-semibold border-b pb-2 mb-2">Section B: Anambra State ID Details</h3>
              </div>
              <Field id="asinNumber" label="ASIN Number" required error={errors.asinNumber}>
                <Input value={data.asinNumber} onChange={(e) => setField("asinNumber", e.target.value)} />
              </Field>
              <Field
                id="nin"
                label="NIN"
                required={!data.asinNumber}
                error={errors.nin}>
                <Input value={data.nin} onChange={(e) => setField("nin", e.target.value)} />
              </Field>
              <Field id="tin" label="TIN (Tax Identification Number)">
                <Input value={data.tin} onChange={(e) => setField("tin", e.target.value)} />
              </Field>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <h3 className="font-semibold border-b pb-2 mb-2">Section C: Motor Park Information</h3>
                </div>
                <Field id="parkName" label="Name of Motor Park/Terminal" required error={errors.parkName}>
                  <Input value={data.parkName} onChange={(e) => setField("parkName", e.target.value)} />
                </Field>
                <Field id="facilityType" label="Type of Facility" required>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.facilityType} onChange={(e) => { setField("facilityType", e.target.value); setField("facilitySubTypes", []); }}>
                    {["Public", "Private", "Loading Bay"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="mb-2 block">Facility Operations</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {facilitySubOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={data.facilitySubTypes.includes(opt)} onCheckedChange={() => toggleArrayItem("facilitySubTypes", opt)} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <Field id="physicalLocation" label="Physical Location" required error={errors.physicalLocation}>
                  <Input value={data.physicalLocation} onChange={(e) => setField("physicalLocation", e.target.value)} />
                </Field>
                <Field id="townCommunity" label="Town/Community" required error={errors.townCommunity}>
                  <Input value={data.townCommunity} onChange={(e) => setField("townCommunity", e.target.value)} />
                </Field>
                <Field id="lga" label="LGA" required error={errors.lga}>
                  <Input value={data.lga} onChange={(e) => setField("lga", e.target.value)} />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <h3 className="font-semibold border-b pb-2 mb-2">Section D: Operational Information</h3>
                </div>
                <Field id="yearEstablished" label="Year Established" required error={errors.yearEstablished}>
                  <Input value={data.yearEstablished} onChange={(e) => setField("yearEstablished", e.target.value)} />
                </Field>
                <Field id="operationalStatus" label="Current Operational Status" required>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.operationalStatus} onChange={(e) => setField("operationalStatus", e.target.value)}>
                    {["Fully Operational", "Partially Operational", "Under Renovation", "Temporarily Closed"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field id="dailyVehiclesCount" label="Number of Vehicles Operating Daily" required>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.dailyVehiclesCount} onChange={(e) => setField("dailyVehiclesCount", e.target.value)}>
                    {["5–20", "21–50", "51–100", "101–300", "Above 300"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <div className="col-span-1 sm:col-span-2">
                  <Field id="vehicleTypes" label="Types of Vehicles Operating" required error={errors.vehicleTypes}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {VEHICLE_TYPES.map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={data.vehicleTypes.includes(opt)} onCheckedChange={() => toggleArrayItem("vehicleTypes", opt)} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </Field>
                  {data.vehicleTypes.includes("Others") && (
                    <Input className="mt-2" placeholder="Specify other vehicles..." value={data.vehicleTypesOther} onChange={(e) => setField("vehicleTypesOther", e.target.value)} />
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold border-b pb-2 mb-3">Section E: Facilities Available</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FACILITIES.map(fac => (
                    <label key={fac} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={!!data.facilitiesAvailable[fac]} onCheckedChange={(c) => toggleFacility(fac, !!c)} />
                      {fac}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <h3 className="font-semibold border-b pb-2 mb-2">Section F: Regulatory Compliance</h3>
                </div>
                <div className="flex flex-col gap-3 col-span-1 sm:col-span-2">
                  <label className="flex items-center gap-2"><Checkbox checked={data.maintainsManifest} onCheckedChange={(c) => setField("maintainsManifest", c)} /> Maintains Daily Passenger Manifest</label>
                  <label className="flex items-center gap-2"><Checkbox checked={data.operatorsRegistered} onCheckedChange={(c) => setField("operatorsRegistered", c)} /> All Operators/Drivers Registered</label>
                  <label className="flex items-center gap-2"><Checkbox checked={data.paymentsUpToDate} onCheckedChange={(c) => setField("paymentsUpToDate", c)} /> Payments of Approved State Revenues Up-to-Date</label>
                  <label className="flex items-center gap-2"><Checkbox checked={data.safetySignages} onCheckedChange={(c) => setField("safetySignages", c)} /> Visible Safety Signages in Park</label>
                  <label className="flex items-center gap-2"><Checkbox checked={data.pendingSanctions} onCheckedChange={(c) => setField("pendingSanctions", c)} /> Any Pending Sanctions from MOT?</label>
                </div>
                {data.pendingSanctions && (
                  <div className="col-span-1 sm:col-span-2">
                    <Field id="sanctionDetails" label="Sanction Details" required error={errors.sanctionDetails}>
                      <Input value={data.sanctionDetails} onChange={(e) => setField("sanctionDetails", e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <h3 className="font-semibold border-b pb-2 mb-2">Section G: Employment & Security Data</h3>
                </div>
                <Field id="managementStaffCount" label="Management Staff Count">
                  <Input type="number" value={data.managementStaffCount} onChange={(e) => setField("managementStaffCount", e.target.value)} />
                </Field>
                <Field id="adminStaffCount" label="Administrative Staff Count">
                  <Input type="number" value={data.adminStaffCount} onChange={(e) => setField("adminStaffCount", e.target.value)} />
                </Field>
                <Field id="securityStaffCount" label="Security Staff Count">
                  <Input type="number" value={data.securityStaffCount} onChange={(e) => setField("securityStaffCount", e.target.value)} />
                </Field>
                <Field id="otherStaffCount" label="Other Staff Count">
                  <Input type="number" value={data.otherStaffCount} onChange={(e) => setField("otherStaffCount", e.target.value)} />
                </Field>
                {parseInt(data.otherStaffCount) > 0 && (
                  <div className="col-span-1 sm:col-span-2">
                    <Field id="otherStaffDetails" label="Specify Other Staff Details" required error={errors.otherStaffDetails}>
                      <Input value={data.otherStaffDetails} onChange={(e) => setField("otherStaffDetails", e.target.value)} />
                    </Field>
                  </div>
                )}
                <Field id="securityArrangement" label="Security Arrangement" required>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.securityArrangement} onChange={(e) => setField("securityArrangement", e.target.value)}>
                    {["Police", "Vigilante", "Private Security", "Community Security", "None"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <h3 className="font-semibold border-b pb-2 mb-2">Section H: Revenue Information</h3>
              </div>
              <Field id="estimatedDailyRevenue" label="Estimated Daily Revenue (NGN)" required error={errors.estimatedDailyRevenue}>
                <Input type="number" value={data.estimatedDailyRevenue} onChange={(e) => setField("estimatedDailyRevenue", e.target.value)} />
              </Field>
              <Field id="estimatedMonthlyRev" label="Estimated Monthly Revenue (NGN)" required error={errors.estimatedMonthlyRev}>
                <Input type="number" value={data.estimatedMonthlyRev} onChange={(e) => setField("estimatedMonthlyRev", e.target.value)} />
              </Field>
              <Field id="revenueCollectionMethod" label="Method of Revenue Collection" required>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.revenueCollectionMethod} onChange={(e) => setField("revenueCollectionMethod", e.target.value)}>
                  {["Cash", "POS", "Bank Transfer", "Online Payment", "Mixed"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              
              <div className="col-span-1 sm:col-span-2 mt-4">
                <h3 className="font-semibold border-b pb-2 mb-2">Passport Photograph</h3>
                <Field label="Owner/Representative Passport" required error={errors.passportPhotoId}>
                  <div className="flex flex-col gap-2">
                    {data.passportPhotoUrl ? (
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm truncate">{data.passportPhotoName}</span>
                        <Button variant="ghost" size="sm" onClick={() => setField("passportPhotoUrl", "")}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                          {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          Upload Photo
                        </Button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                          e.target.value = "";
                        }} />
                      </div>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          )}
        </CardContent>
        <div className="flex justify-between p-6 border-t">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>Back</Button>
          ) : <div />}
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Application
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
