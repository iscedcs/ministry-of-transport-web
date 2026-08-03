/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export interface LetterVehicleData {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  authorityRef: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownershipType?: string | null;
  makeModel?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  assignedRoute?: string | null;
  insuranceCertificateNo?: string | null;
  insuranceCommencement?: Date | string | null;
  insuranceExpiry?: Date | string | null;
  particularsIssueDate?: Date | string | null;
  particularsExpiryDate?: Date | string | null;
  authorityIssueDate?: Date | string | null;
  authorityExpiryDate?: Date | string | null;
  assignedDriver?: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    licenseNumber?: string | null;
    photoUrl?: string | null;
    licenseIssueDate?: Date | string | null;
    licenseExpiryDate?: Date | string | null;
  } | null;
}

export function LetterOfAuthorityDocument({
  vehicle,
  showActions = true,
}: {
  vehicle: LetterVehicleData;
  showActions?: boolean;
}) {
  const driver = vehicle.assignedDriver;

  const publicVerificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/tracas/${vehicle.authorityRef}`
      : `https://mot.anambra.gov.ng/verify/tracas/${vehicle.authorityRef}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    publicVerificationUrl,
  )}`;

  const formatDateStr = (
    date: Date | string | null | undefined,
    defaultText = "N/A",
  ) => {
    if (!date) return defaultText;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return format(d, "dd MMM yyyy");
    } catch {
      return String(date);
    }
  };

  // Expiration rule: Always 31st January of the following year (unless specific valid date provided)
  const getAuthorityExpiryFormatted = (
    issueDate: Date | string | null | undefined,
    expiryDate: Date | string | null | undefined,
  ) => {
    if (expiryDate && expiryDate !== "PERPETUAL") {
      try {
        const d = new Date(expiryDate);
        if (!isNaN(d.getTime())) {
          return format(d, "dd MMMM yyyy");
        }
      } catch {
        // Fallback below
      }
    }
    const issueD = issueDate ? new Date(issueDate) : new Date();
    const issueYear = isNaN(issueD.getTime())
      ? new Date().getFullYear()
      : issueD.getFullYear();
    return `31st January ${issueYear + 1}`;
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const issueDateFormatted = formatDateStr(
    vehicle.authorityIssueDate,
    format(new Date(), "dd MMM yyyy"),
  );
  const expiryDateFormatted = getAuthorityExpiryFormatted(
    vehicle.authorityIssueDate,
    vehicle.authorityExpiryDate,
  );

  return (
    <div className="flex flex-col items-center">
      {/* Top Action Bar (hidden when printing) */}
      {showActions && (
        <div className="w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden bg-card p-4 rounded-xl border border-border shadow-sm">
          <Link
            href="/tracas"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to TRACAS Fleet
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:bg-primary/90 transition-colors text-sm cursor-pointer">
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Sheet Container */}
      <div
        id="letter-of-authority-sheet"
        className="w-full max-w-[800px] min-h-[1050px] bg-white text-slate-900 font-serif border border-slate-300 p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        
        {/* Main Upper Content Wrapper */}
        <div className="flex-1 flex flex-col justify-start">
          {/* Header Block */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/anambra_mot_logo.png"
                alt="Anambra Crest"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-emerald-800 uppercase leading-tight">
                  GOVERNMENT OF ANAMBRA STATE OF NIGERIA
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-red-700 uppercase tracking-wide">
                  MINISTRY OF TRANSPORT
                </h2>
              </div>
            </div>

            <div className="text-right text-xs sm:text-sm font-sans text-slate-800 leading-snug">
              <p className="font-semibold">Government House</p>
              <p>P.M.B. 5036</p>
              <p>Awka</p>
              <p className="mt-1 font-semibold">
                {vehicle.authorityIssueDate
                  ? format(new Date(vehicle.authorityIssueDate), "dd MMMM yyyy")
                  : format(new Date(), "dd MMMM yyyy")}
              </p>
            </div>
          </div>

          {/* Reference Numbers, QR Code & TRACAS Logo + Driver Passport Photo Row */}
          <div className="flex items-start justify-between my-4 px-2">
            {/* Left Column: Our Ref / Your Ref & QR Code */}
            <div className="flex flex-col items-start space-y-4">
              <div className="text-xs sm:text-sm font-sans">
                <p>
                  <span className="font-bold">Our Ref:</span>{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {vehicle.authorityRef}
                  </span>
                </p>
                <p>
                  <span className="font-bold">Your Ref:</span>
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-28 h-28 border border-slate-900 p-1 bg-white shadow-xs">
                  <img
                    src={qrImageUrl}
                    alt="Verification QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-sans text-slate-600 mt-1 uppercase font-semibold">
                  Scan to Verify
                </span>
              </div>
            </div>

            {/* Right Column: TRACAS Logo above, Driver Passport Photo below */}
            <div className="flex flex-col items-center space-y-2">
              <div className="h-10 flex items-center justify-center">
                <img
                  src="/tracas_logo-transparent.png"
                  alt="Tracas Official Logo"
                  className="w-24 h-12 object-contain filter drop-shadow-sm"
                />
              </div>

              <div className="flex flex-col items-center">
                <div className="w-28 h-32 border border-slate-900 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-xs">
                  {driver?.photoUrl ? (
                    <img
                      src={driver.photoUrl}
                      alt={driver.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400 font-sans text-xs">
                      <p className="font-bold uppercase text-[10px]">
                        PASSPORT PHOTO
                      </p>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-sans text-slate-600 mt-1 uppercase font-semibold">
                  Driver Photo
                </span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-5">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider underline decoration-2 underline-offset-4 text-slate-950">
              TO WHOM IT MAY CONCERN
            </h2>
          </div>

          {/* Legal Text & Particulars Body */}
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-900 font-serif">
            <p className="text-justify">
              This is to certify that the vehicle with Registration Number{" "}
              <span className="font-bold text-slate-950 underline">
                {vehicle.registrationNumber}
              </span>{" "}
              Fleet Number{" "}
              <span className="font-bold text-slate-950 underline">
                {vehicle.fleetNumber}
              </span>{" "}
              is managed by Anambra State Government under the authority of
              Transport Company of Anambra State (TRACAS). All relevant documents
              / particulars of the said vehicle remain with the above authority.
            </p>

            <div className="space-y-2 py-2 font-serif">
              <p>
                <span className="font-semibold">Driver&apos;s Name:</span>{" "}
                <span className="font-bold text-slate-950">
                  {driver?.fullName || "Unassigned"}
                </span>
              </p>

              {vehicle.ownerName && (
                <p>
                  <span className="font-semibold">Vehicle Owner:</span>{" "}
                  <span className="font-bold text-slate-950">
                    {vehicle.ownerName}
                  </span>{" "}
                  {vehicle.ownerPhone && (
                    <span className="font-mono text-xs text-slate-700">
                      ({vehicle.ownerPhone})
                    </span>
                  )}
                  {vehicle.ownershipType &&
                    vehicle.ownershipType !== "GOVERNMENT_OWNED" && (
                      <span className="ml-2 text-xs font-sans uppercase font-bold text-slate-600">
                        [
                        {vehicle.ownershipType === "INDIVIDUAL"
                          ? "Private Owner"
                          : "Franchise"}
                        ]
                      </span>
                    )}
                </p>
              )}

              <p>
                <span className="font-semibold">
                  Vehicle particulars issued on
                </span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(vehicle.particularsIssueDate)}
                </span>{" "}
                <span className="font-semibold">Expires on</span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(vehicle.particularsExpiryDate)}
                </span>
              </p>

              <p>
                <span className="font-semibold">Engine No</span>{" "}
                <span className="font-mono">{vehicle.engineNumber || "N/A"}</span>{" "}
                <span className="font-semibold">Chassis No / VIN</span>{" "}
                <span className="font-mono">
                  {vehicle.chassisNumber || "N/A"}
                </span>
              </p>

              <p>
                <span className="font-semibold">
                  Driver&apos;s License Number
                </span>{" "}
                <span className="font-mono font-bold">
                  {driver?.licenseNumber || "N/A"}
                </span>{" "}
                <span className="font-semibold">Issued on</span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(driver?.licenseIssueDate)}
                </span>{" "}
                <span className="font-semibold">Expires on</span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(driver?.licenseExpiryDate)}
                </span>{" "}
                <span className="font-semibold">Insurance Certificate No.</span>{" "}
                <span className="font-mono font-bold">
                  {vehicle.insuranceCertificateNo || "N/A"}
                </span>
              </p>

              <p>
                <span className="font-semibold">Commencement of Insurance</span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(vehicle.insuranceCommencement)}
                </span>{" "}
                <span className="font-semibold">Expiring of Insurance</span>{" "}
                <span className="text-xs font-mono">
                  {formatDateStr(vehicle.insuranceExpiry)}
                </span>
              </p>

              {vehicle.assignedRoute && (
                <p>
                  <span className="font-semibold">Assigned Route:</span>{" "}
                  <span className="font-bold text-slate-950">
                    {vehicle.assignedRoute}
                  </span>
                </p>
              )}
            </div>

            <p className="text-justify pt-2">
              The bearer, who must show his identity card (TRACAS) is empowered to
              ply route assigned to him by the company.
            </p>

            <p className="text-justify font-medium">
              All law enforcement agents are hereby requested to render maximum
              assistance to the driver.
            </p>

            <p className="text-justify font-semibold pt-2">
              This letter of authority is issued on{" "}
              <span className="text-xs font-mono font-bold">
                {issueDateFormatted}
              </span>{" "}
              and expires on{" "}
              <span className="text-xs font-mono font-bold">
                {expiryDateFormatted}
              </span>
            </p>
          </div>
        </div>

        {/* Dual Signature Block (Positioned at the end end) */}
        <div className="grid grid-cols-2 gap-8 mt-auto pt-10 font-sans text-xs sm:text-sm">
          {/* Left Signatory: Ministry / SSG */}
          <div className="flex flex-col items-start">
            <div className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2">
              <span className="text-slate-400 font-mono text-[10px] italic mb-1">
                [DIGITAL SIGNATURE]
              </span>
            </div>
            <p className="font-bold text-slate-950 text-sm sm:text-base">
              Hon. Edward Obiefuna Ibuzo
            </p>
            <p className="text-slate-700 font-medium">
              Commissioner Min. of Transport
            </p>
            <p className="text-slate-500 text-xs">Anambra State Government</p>
          </div>

          {/* Right Signatory: TRACAS MD/CEO */}
          <div className="flex flex-col items-end text-right">
            <div className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2">
              <span className="text-slate-400 font-mono text-[10px] italic mb-1">
                [DIGITAL SIGNATURE]
              </span>
            </div>
            <p className="font-bold text-slate-950 text-sm sm:text-base">
              Okeke Njideka
            </p>
            <p className="text-slate-700 font-medium">Ag. MD/CEO (TRACAS)</p>
            <p className="text-slate-950 font-mono font-bold">08034728664</p>
          </div>
        </div>

        {/* Bottom Bar Accent */}
        <div className="mt-8 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 bg-emerald-800 text-white text-center py-2.5 px-4 font-sans text-xs font-semibold tracking-wide print:-mx-0 print:-mb-0">
          All replies to be addressed to the Secretary to the State Government
        </div>
      </div>
    </div>
  );
}
