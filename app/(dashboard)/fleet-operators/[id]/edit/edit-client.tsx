"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bus,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  Palette,
  ShieldAlert,
  Coins,
  CheckSquare,
  Sparkles,
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
import { updateMassTransitCompany } from "@/app/actions/mass-transit";
import { FACILITY_ITEMS } from "@/lib/facilities";

interface TerminalData {
  id: string;
  locationAddress: string;
  gpsCoordinates: string | null;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  managerResidentialAddress: string;
  businessPremisesCertNo: string | null;
}

interface FleetCompanyInitialData {
  id: string;
  companyName: string;
  cacNumber: string | null;
  asinNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  businessPremisesCert: string | null;
  ansaaRegistration: string | null;
  approvedColour: string | null;
  currentFleetSize: number | null;
  minFleetSize: number;
  applicationStatus: string;
  permitStatus: string | null;
  permitNumber: string | null;
  monthlyLevyAmount: number | null;
  assessedFeeAmount: number | null;
  psRecommendationNotes: string | null;
  facilitiesAvailable: unknown;
  terminals: TerminalData[];
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

export function EditFleetOperatorClient({
  company,
}: {
  company: FleetCompanyInitialData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const primaryTerm = company.terminals?.[0];

  const initialFacilities: Record<string, boolean> = (() => {
    if (
      company.facilitiesAvailable &&
      typeof company.facilitiesAvailable === "object" &&
      !Array.isArray(company.facilitiesAvailable)
    ) {
      return company.facilitiesAvailable as Record<string, boolean>;
    }
    return {};
  })();

  const [facilities, setFacilities] = useState<Record<string, boolean>>(initialFacilities);

  const [form, setForm] = useState({
    // Company Particulars
    companyName: company.companyName || "",
    cacNumber: company.cacNumber || "",
    asinNumber: company.asinNumber || "",
    businessPremisesCert: company.businessPremisesCert || "",
    ansaaRegistration: company.ansaaRegistration || "",
    approvedColour: company.approvedColour || "",
    currentFleetSize:
      company.currentFleetSize !== null ? String(company.currentFleetSize) : "0",
    minFleetSize: String(company.minFleetSize ?? 5),

    // Contact Details
    contactPerson: company.contactPerson || "",
    contactPhone: company.contactPhone || "",
    contactEmail: company.contactEmail || "",

    // Terminal & Location Details
    terminalId: primaryTerm?.id || "",
    terminalLocationAddress: primaryTerm?.locationAddress || "",
    terminalGpsCoordinates: primaryTerm?.gpsCoordinates || "",
    terminalManagerName: primaryTerm?.managerName || "",
    terminalManagerPhone: primaryTerm?.managerPhone || "",
    terminalManagerEmail: primaryTerm?.managerEmail || "",
    terminalManagerResidentialAddress:
      primaryTerm?.managerResidentialAddress || "",
    terminalBusinessPremisesCertNo: primaryTerm?.businessPremisesCertNo || "",

    // Workflow / Overrides
    applicationStatus: company.applicationStatus || "SUBMITTED",
    permitStatus: company.permitStatus || "",
    permitNumber: company.permitNumber || "",
    monthlyLevyAmount:
      company.monthlyLevyAmount !== null
        ? String(company.monthlyLevyAmount / 100)
        : "",
    assessedFeeAmount:
      company.assessedFeeAmount !== null
        ? String(company.assessedFeeAmount / 100)
        : "",
    psRecommendationNotes: company.psRecommendationNotes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleFacility = (item: string) => {
    setFacilities((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toast.error("Company Name is required");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      formData.set(key, val);
    });

    // Append facilities json
    formData.set("facilitiesAvailable", JSON.stringify(facilities));

    startTransition(async () => {
      const res = await updateMassTransitCompany(company.id, formData);
      if (res.success) {
        toast.success("Mass transit operator application updated successfully.");
        router.push(`/fleet-operators/${company.id}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update application.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl py-2">
      <Link
        href={`/fleet-operators/${company.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Operator Details
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display tracking-tight">
              Edit Mass Transit Operator Application
            </h1>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-md border border-primary/20">
              Admin Mode
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Updating full registration, terminal address, facilities, and status records for{" "}
            <strong className="text-foreground">{company.companyName}</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Particulars & Brand */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" /> Company Particulars & Brand
            </CardTitle>
            <CardDescription>
              Registered business details, CAC, ASIN, brand colour, and fleet size.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="e.g. ISCE Digital Concept Ltd"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cacNumber">CAC Registration Number</Label>
              <Input
                id="cacNumber"
                name="cacNumber"
                value={form.cacNumber}
                onChange={handleChange}
                placeholder="e.g. RC-347828"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asinNumber">ASIN Number</Label>
              <Input
                id="asinNumber"
                name="asinNumber"
                value={form.asinNumber}
                onChange={handleChange}
                placeholder="e.g. 3267386524718893"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessPremisesCert">
                Business Premises Certificate No.
              </Label>
              <Input
                id="businessPremisesCert"
                name="businessPremisesCert"
                value={form.businessPremisesCert}
                onChange={handleChange}
                placeholder="e.g. BPC-987654"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ansaaRegistration">
                ANSAA Registration Number
              </Label>
              <Input
                id="ansaaRegistration"
                name="ansaaRegistration"
                value={form.ansaaRegistration}
                onChange={handleChange}
                placeholder="e.g. ANSAA-12345"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentFleetSize">Declared Fleet Size</Label>
              <Input
                id="currentFleetSize"
                name="currentFleetSize"
                type="number"
                min="0"
                value={form.currentFleetSize}
                onChange={handleChange}
                placeholder="e.g. 12"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minFleetSize">Minimum Fleet Required</Label>
              <Input
                id="minFleetSize"
                name="minFleetSize"
                type="number"
                min="1"
                value={form.minFleetSize}
                onChange={handleChange}
                placeholder="5"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="approvedColour" className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-primary" /> Approved Brand Colour (Hex / Code)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.approvedColour?.startsWith("#") ? form.approvedColour : "#10b981"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, approvedColour: e.target.value }))
                  }
                  className="w-10 h-10 p-0.5 rounded border border-input cursor-pointer bg-background"
                />
                <Input
                  id="approvedColour"
                  name="approvedColour"
                  value={form.approvedColour}
                  onChange={handleChange}
                  placeholder="#10b981 or Navy Blue"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact Details */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Contact Person Details
            </CardTitle>
            <CardDescription>
              Primary administrative representative and official communication channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person Name</Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleChange}
                placeholder="Full name of representative"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact Phone Number</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="08012345678"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contactEmail">Contact Email Address</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                placeholder="contact@company.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Terminal / Depot Location & Manager */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Terminal / Depot Location & Manager
            </CardTitle>
            <CardDescription>
              Physical terminal site address, GPS, and on-site manager particulars.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="terminalLocationAddress">
                Terminal Physical Address
              </Label>
              <Input
                id="terminalLocationAddress"
                name="terminalLocationAddress"
                value={form.terminalLocationAddress}
                onChange={handleChange}
                placeholder="e.g. Plot 4 Expressway By-Pass, Onitsha"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalGpsCoordinates">GPS Coordinates</Label>
              <Input
                id="terminalGpsCoordinates"
                name="terminalGpsCoordinates"
                value={form.terminalGpsCoordinates}
                onChange={handleChange}
                placeholder="e.g. 6.1528, 6.7865"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalBusinessPremisesCertNo">
                Site Business Premises Cert No.
              </Label>
              <Input
                id="terminalBusinessPremisesCertNo"
                name="terminalBusinessPremisesCertNo"
                value={form.terminalBusinessPremisesCertNo}
                onChange={handleChange}
                placeholder="e.g. BPC-SITE-001"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalManagerName">Terminal Manager Name</Label>
              <Input
                id="terminalManagerName"
                name="terminalManagerName"
                value={form.terminalManagerName}
                onChange={handleChange}
                placeholder="Manager full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalManagerPhone">Terminal Manager Phone</Label>
              <Input
                id="terminalManagerPhone"
                name="terminalManagerPhone"
                value={form.terminalManagerPhone}
                onChange={handleChange}
                placeholder="08012345678"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalManagerEmail">Terminal Manager Email</Label>
              <Input
                id="terminalManagerEmail"
                name="terminalManagerEmail"
                type="email"
                value={form.terminalManagerEmail}
                onChange={handleChange}
                placeholder="manager@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terminalManagerResidentialAddress">
                Manager Residential Address
              </Label>
              <Input
                id="terminalManagerResidentialAddress"
                name="terminalManagerResidentialAddress"
                value={form.terminalManagerResidentialAddress}
                onChange={handleChange}
                placeholder="e.g. 10 Oguta Road, Onitsha"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Facilities & Amenities Checklist */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" /> Declared Facilities & Amenities
            </CardTitle>
            <CardDescription>
              Toggle infrastructure declared for this mass transit terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {FACILITY_ITEMS.map((item) => {
                const isChecked = !!facilities[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleFacility(item)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-sm transition-colors ${
                      isChecked
                        ? "bg-primary/10 border-primary text-foreground font-medium"
                        : "bg-background border-border/70 text-muted-foreground hover:bg-accent/40"
                    }`}>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground font-bold"
                          : "border-muted-foreground/40 bg-background"
                      }`}>
                      {isChecked ? "✓" : ""}
                    </span>
                    <span className="truncate">{item}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Workflow, Permit & Financial Overrides */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" /> Application Workflow & Financial Controls
            </CardTitle>
            <CardDescription>
              Administrative overrides for application lifecycle, permit issuance, and levy assessments.
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
                placeholder="Internal notes or PS recommendation remarks for this operator..."
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
            <Link href={`/fleet-operators/${company.id}`}>Cancel</Link>
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
