"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLogisticsApplicant } from "@/app/actions/logistics";
import type { ApplicationStatus, LogisticsApplicantType } from "@prisma/client";

interface ApplicantRecord {
  id: string;
  applicantType: LogisticsApplicantType;
  companyName: string | null;
  cacNumber: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string | null;
  address: string | null;
  applicationStatus: ApplicationStatus;
  permitNumber: string | null;
}

export default function EditLogisticsClient({ applicant }: { applicant: ApplicantRecord }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState(applicant.companyName ?? "");
  const [cacNumber, setCacNumber] = useState(applicant.cacNumber ?? "");
  const [contactPerson, setContactPerson] = useState(applicant.contactPerson);
  const [contactPhone, setContactPhone] = useState(applicant.contactPhone);
  const [contactEmail, setContactEmail] = useState(applicant.contactEmail ?? "");
  const [address, setAddress] = useState(applicant.address ?? "");

  const isCompany = applicant.applicantType === "COMPANY";

  const submit = () => {
    if (isCompany && !companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    if (!contactPerson.trim() || !contactPhone.trim()) {
      toast.error("Contact name and phone number are required.");
      return;
    }
    startTransition(async () => {
      const res = await updateLogisticsApplicant(applicant.id, {
        applicantType: applicant.applicantType,
        companyName,
        cacNumber,
        contactPerson,
        contactPhone,
        contactEmail,
        address,
      });
      if (res.success) {
        toast.success("Changes saved.");
        router.push(`/logistics/${applicant.id}`);
      } else {
        toast.error(res.error || "Could not save the changes.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link
        href={`/logistics/${applicant.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to applicant
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Logistics Applicant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Correct any detail entered at registration. Vehicles are managed from the applicant
          page.
        </p>
      </div>

      {applicant.applicationStatus === "APPROVED" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Reference <span className="font-mono font-semibold">{applicant.permitNumber}</span>{" "}
            has already been issued. The printed letters pull these details live, so reprint
            them after saving if you change the name or address.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isCompany ? "Company" : "Operator"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {isCompany && (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="companyName">
                  Company name <span className="text-destructive">*</span>
                </Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cacNumber">CAC number</Label>
                <Input id="cacNumber" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="contactPerson">
              {isCompany ? "Contact person" : "Name"} <span className="text-destructive">*</span>
            </Label>
            <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push(`/logistics/${applicant.id}`)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
