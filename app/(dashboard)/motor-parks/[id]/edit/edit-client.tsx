"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Coins,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ANAMBRA_LGAS } from "@/lib/consts";
import { updateMotorParkApplication } from "@/app/actions/motor-park";

interface MotorParkInitialData {
  id: string;
  businessName: string;
  transportCompanyName: string | null;
  streetAddress: string;
  townCity: string;
  lga: string;
  gpsCoordinates: string | null;
  cacRegistrationNumber: string | null;
  anssidNumber: string;
  parkId: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  managerResidentialAddress: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  applicationStatus: string;
  permitStatus: string | null;
  permitNumber: string | null;
  monthlyLevyAmount: number | null;
  assessedFeeAmount: number | null;
  psRecommendationNotes: string | null;
}

const APPLICATION_STATUSES = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "INSPECTION_SCHEDULED", label: "Inspection Scheduled" },
  { value: "INSPECTION_COMPLETED", label: "Inspection Completed" },
  { value: "PENDING_PS_APPROVAL", label: "Pending PS Approval" },
  { value: "PENDING_COMMISSIONER_APPROVAL", label: "Pending Commissioner Approval" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "TEMPORAL_APPROVAL", label: "Temporary Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVOKED", label: "Revoked" },
];

const PERMIT_STATUSES = [
  { value: "", label: "No Permit Assigned" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REVOKED", label: "Revoked" },
  { value: "SUSPENDED", label: "Suspended" },
];

export function EditMotorParkClient({
  park,
}: {
  park: MotorParkInitialData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    businessName: park.businessName || "",
    transportCompanyName: park.transportCompanyName || "",
    streetAddress: park.streetAddress || "",
    townCity: park.townCity || "",
    lga: park.lga || "",
    gpsCoordinates: park.gpsCoordinates || "",
    cacRegistrationNumber: park.cacRegistrationNumber || "",
    anssidNumber: park.anssidNumber || "",
    parkId: park.parkId || "",
    contactPerson: park.contactPerson || "",
    contactPhone: park.contactPhone || "",
    contactEmail: park.contactEmail || "",
    managerResidentialAddress: park.managerResidentialAddress || "",
    nextOfKinName: park.nextOfKinName || "",
    nextOfKinPhone: park.nextOfKinPhone || "",

    // Workflow & Financial controls
    applicationStatus: park.applicationStatus || "SUBMITTED",
    permitStatus: park.permitStatus || "",
    permitNumber: park.permitNumber || "",
    monthlyLevyAmount:
      park.monthlyLevyAmount !== null
        ? String(park.monthlyLevyAmount / 100)
        : "",
    assessedFeeAmount:
      park.assessedFeeAmount !== null
        ? String(park.assessedFeeAmount / 100)
        : "",
    psRecommendationNotes: park.psRecommendationNotes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.businessName.trim()) {
      toast.error("Park / Business Name is required");
      return;
    }
    if (!form.streetAddress.trim()) {
      toast.error("Street Address is required");
      return;
    }
    if (!form.townCity.trim()) {
      toast.error("Town / City is required");
      return;
    }
    if (!form.lga.trim()) {
      toast.error("LGA is required");
      return;
    }
    if (!form.anssidNumber.trim()) {
      toast.error("ANSSID Number is required");
      return;
    }
    if (!form.contactPerson.trim()) {
      toast.error("Contact Person is required");
      return;
    }
    if (!form.contactPhone.trim()) {
      toast.error("Contact Phone is required");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      formData.set(key, val);
    });

    startTransition(async () => {
      const res = await updateMotorParkApplication(park.id, formData);
      if (res.success) {
        toast.success("Motor park application updated successfully.");
        router.push(`/motor-parks/${park.id}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update application.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl py-2">
      <Link
        href={`/motor-parks/${park.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Motor Park Details
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display tracking-tight">
              Edit Motor Park Application
            </h1>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-md border border-primary/20">
              Admin Mode
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Updating official records, address particulars, status, and financial controls for{" "}
            <strong className="text-foreground">{park.businessName}</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Location & Address */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Park Location & Address
            </CardTitle>
            <CardDescription>
              Physical site location within Anambra State.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="streetAddress">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="streetAddress"
                name="streetAddress"
                value={form.streetAddress}
                onChange={handleChange}
                placeholder="e.g. 14 Zik Avenue, near Main Market"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="townCity">
                Town / City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="townCity"
                name="townCity"
                value={form.townCity}
                onChange={handleChange}
                placeholder="e.g. Awka, Onitsha, Nnewi"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lga">
                LGA <span className="text-destructive">*</span>
              </Label>
              <select
                id="lga"
                name="lga"
                value={form.lga}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select LGA</option>
                {ANAMBRA_LGAS.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="gpsCoordinates">GPS Coordinates</Label>
              <Input
                id="gpsCoordinates"
                name="gpsCoordinates"
                value={form.gpsCoordinates}
                onChange={handleChange}
                placeholder="e.g. 6.2209, 7.0674"
              />
              <p className="text-[11px] text-muted-foreground">
                Latitude, Longitude (decimal format)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Business Particulars */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Business & Registration Details
            </CardTitle>
            <CardDescription>
              Registered entity, ANSSID, and permanent park identifiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">
                Park / Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="businessName"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                placeholder="e.g. Peace Mass Transit Park Awka"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transportCompanyName">
                Transport Company / Union
              </Label>
              <Input
                id="transportCompanyName"
                name="transportCompanyName"
                value={form.transportCompanyName}
                onChange={handleChange}
                placeholder="e.g. Peace Group / NURTW"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="anssidNumber">
                ANSSID Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="anssidNumber"
                name="anssidNumber"
                value={form.anssidNumber}
                onChange={handleChange}
                placeholder="e.g. ANS-2024-XXXX"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cacRegistrationNumber">CAC Number</Label>
              <Input
                id="cacRegistrationNumber"
                name="cacRegistrationNumber"
                value={form.cacRegistrationNumber}
                onChange={handleChange}
                placeholder="e.g. RC-1234567"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="parkId">Permanent Park ID</Label>
              <Input
                id="parkId"
                name="parkId"
                value={form.parkId}
                onChange={handleChange}
                placeholder="e.g. ANS-MOT-PK-000123"
              />
              <p className="text-[11px] text-muted-foreground">
                Assigned Ministry permanent public identifier.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Contact Person & Manager */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Contact Person & Park Manager
            </CardTitle>
            <CardDescription>
              Primary administrative and operational contacts for this park.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">
                Contact Person Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleChange}
                placeholder="Full name of park contact"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">
                Contact Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="08012345678"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                placeholder="contact@example.com"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="managerResidentialAddress">
                Manager Residential Address
              </Label>
              <Input
                id="managerResidentialAddress"
                name="managerResidentialAddress"
                value={form.managerResidentialAddress}
                onChange={handleChange}
                placeholder="e.g. 5 Oguta Road, Onitsha"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinName">Next of Kin Name</Label>
              <Input
                id="nextOfKinName"
                name="nextOfKinName"
                value={form.nextOfKinName}
                onChange={handleChange}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
              <Input
                id="nextOfKinPhone"
                name="nextOfKinPhone"
                value={form.nextOfKinPhone}
                onChange={handleChange}
                placeholder="08012345678"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Workflow, Permit & Financial Overrides */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" /> Application Workflow & Financial Controls
            </CardTitle>
            <CardDescription>
              Administrative overrides for application status, permit issuance, and levy assessments.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="applicationStatus">Application Status</Label>
              <select
                id="applicationStatus"
                name="applicationStatus"
                value={form.applicationStatus}
                onChange={handleChange}
                className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {APPLICATION_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="permitStatus">Permit Status</Label>
              <select
                id="permitStatus"
                name="permitStatus"
                value={form.permitStatus}
                onChange={handleChange}
                className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {PERMIT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="permitNumber">Permit Number</Label>
              <Input
                id="permitNumber"
                name="permitNumber"
                value={form.permitNumber}
                onChange={handleChange}
                placeholder="e.g. MOT/PTO/2026/0012"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monthlyLevyAmount">Monthly Levy (₦)</Label>
              <Input
                id="monthlyLevyAmount"
                name="monthlyLevyAmount"
                type="number"
                min="0"
                step="1000"
                value={form.monthlyLevyAmount}
                onChange={handleChange}
                placeholder="e.g. 50000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assessedFeeAmount">Assessed Registration Fee (₦)</Label>
              <Input
                id="assessedFeeAmount"
                name="assessedFeeAmount"
                type="number"
                min="0"
                step="1000"
                value={form.assessedFeeAmount}
                onChange={handleChange}
                placeholder="e.g. 10000"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="psRecommendationNotes">
                Permanent Secretary Recommendation / Admin Notes
              </Label>
              <Textarea
                id="psRecommendationNotes"
                name="psRecommendationNotes"
                value={form.psRecommendationNotes}
                onChange={handleChange}
                rows={3}
                placeholder="Internal notes or PS recommendation remarks for this motor park..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isPending}>
            <Link href={`/motor-parks/${park.id}`}>Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={isPending}
            className="gap-2 font-semibold">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
