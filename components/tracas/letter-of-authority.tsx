/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";


export interface LetterVehicleData {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  category: string;
  makeModel?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  insuranceCertificateNo?: string | null;
  insuranceCommencement?: Date | string | null;
  insuranceExpiry?: Date | string | null;
  particularsIssueDate?: Date | string | null;
  particularsExpiryDate?: Date | string | null;
  assignedRoute?: string | null;
  ownershipType?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerAddress?: string | null;
  ownerNIN?: string | null;
  authorityRef: string;

  authorityIssueDate?: Date | string | null;
  authorityExpiryDate?: Date | string | null;
  assignedDriver?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    photoUrl?: string | null;
    licenseNumber?: string | null;
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

  const publicVerificationUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/tracas/${vehicle.authorityRef}`
    : `https://mot.anambra.gov.ng/verify/tracas/${vehicle.authorityRef}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    publicVerificationUrl
  )}`;

  const formatDateStr = (date: Date | string | null | undefined, defaultText = "N/A") => {
    if (!date) return defaultText;
    try {
      const d = new Date(date);
      return format(d, "EEE MMM dd yyyy HH:mm:ss 'GMT+0100 (West Africa Standard Time)'");
    } catch {
      return String(date);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Top Action Bar (hidden when printing) */}
      {showActions && (
        <div className="w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden bg-card p-4 rounded-xl border border-border shadow-sm">
          <Link
            href="/tracas"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to TRACAS Fleet
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:bg-primary/90 transition-colors text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Sheet Container */}
      <div
        id="letter-of-authority-sheet"
        className="w-full max-w-[800px] bg-white text-slate-900 font-serif border border-slate-300 p-8 sm:p-12 shadow-2xl relative print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
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

        {/* Reference Numbers & Center Emblem */}
        <div className="flex items-center justify-between my-2 text-xs sm:text-sm font-sans">
          <div>
            <p>
              <span className="font-bold">Our Ref:</span>{" "}
              <span className="font-mono font-bold text-slate-900">{vehicle.authorityRef}</span>
            </p>
            <p>
              <span className="font-bold">Your Ref:</span>
            </p>
          </div>

          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src="/anambra_mot_logo.png"
              alt="Anambra Coat of Arms"
              className="w-14 h-14 object-contain filter drop-shadow-sm"
            />
          </div>

          <div className="w-24"></div>
        </div>

        {/* QR Code & Driver Passport Photo Row */}
        <div className="flex items-center justify-between my-4 px-2">
          {/* Left: QR Code Box */}
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 border border-slate-900 p-1 bg-white shadow-xs">
              <img src={qrImageUrl} alt="Verification QR Code" className="w-full h-full object-contain" />
            </div>
            <span className="text-[10px] font-sans text-slate-600 mt-1 uppercase font-semibold">
              Scan to Verify
            </span>
          </div>

          {/* Right: Driver Passport Photo Container */}
          <div className="flex flex-col items-center">
            <div className="w-28 h-32 border border-slate-900 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-xs">
              {driver?.photoUrl ? (
                <img src={driver.photoUrl} alt={driver.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-slate-400 font-sans text-xs">
                  <p className="font-bold uppercase text-[10px]">PASSPORT PHOTO</p>
                </div>
              )}
            </div>
            <span className="text-[10px] font-sans text-slate-600 mt-1 uppercase font-semibold">
              Driver Photo
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider underline decoration-2 underline-offset-4 text-slate-950">
            TO WHOM IT MAY CONCERN
          </h2>
        </div>

        {/* Legal Text & Particulars Body */}
        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-900 font-serif">
          <p className="text-justify">
            This is to certify that the vehicle with Registration Number{" "}
            <span className="font-bold text-slate-950 underline">{vehicle.registrationNumber}</span> Fleet Number{" "}
            <span className="font-bold text-slate-950 underline">{vehicle.fleetNumber}</span> is managed by Anambra
            State Government under the authority of Transport Company of Anambra State (TRACAS). All relevant documents
            / particulars of the said vehicle remain with the above authority.
          </p>

          <div className="space-y-2 py-2 font-serif">
            <p>
              <span className="font-semibold">Driver&apos;s Name:</span>{" "}
              <span className="font-bold text-slate-950">{driver?.fullName || "Unassigned"}</span>
            </p>

            {vehicle.ownerName && (
              <p>
                <span className="font-semibold">Vehicle Owner:</span>{" "}
                <span className="font-bold text-slate-950">{vehicle.ownerName}</span>{" "}
                {vehicle.ownerPhone && (
                  <span className="font-mono text-xs text-slate-700">({vehicle.ownerPhone})</span>
                )}
                {vehicle.ownershipType && vehicle.ownershipType !== "GOVERNMENT_OWNED" && (
                  <span className="ml-2 text-xs font-sans uppercase font-bold text-slate-600">
                    [{vehicle.ownershipType === "INDIVIDUAL" ? "Private Owner" : "Franchise"}]
                  </span>
                )}
              </p>
            )}


            <p>
              <span className="font-semibold">Vehicle particulars issued on</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(vehicle.particularsIssueDate)}</span>{" "}
              <span className="font-semibold">Expires on</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(vehicle.particularsExpiryDate)}</span>
            </p>

            <p>
              <span className="font-semibold">Engine No</span>{" "}
              <span className="font-mono">{vehicle.engineNumber || "N/A"}</span>{" "}
              <span className="font-semibold">Chassis No / VIN</span>{" "}
              <span className="font-mono">{vehicle.chassisNumber || "N/A"}</span>
            </p>

            <p>
              <span className="font-semibold">Driver&apos;s License Number</span>{" "}
              <span className="font-mono font-bold">{driver?.licenseNumber || "N/A"}</span>{" "}
              <span className="font-semibold">Issued on</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(driver?.licenseIssueDate)}</span>{" "}
              <span className="font-semibold">Expires on</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(driver?.licenseExpiryDate)}</span>{" "}
              <span className="font-semibold">Insurance Certificate No.</span>{" "}
              <span className="font-mono font-bold">{vehicle.insuranceCertificateNo || "N/A"}</span>
            </p>

            <p>
              <span className="font-semibold">Commencement of Insurance</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(vehicle.insuranceCommencement)}</span>{" "}
              <span className="font-semibold">Expiring of Insurance</span>{" "}
              <span className="text-xs font-mono">{formatDateStr(vehicle.insuranceExpiry)}</span>
            </p>

            {vehicle.assignedRoute && (
              <p>
                <span className="font-semibold">Assigned Route:</span>{" "}
                <span className="font-bold text-slate-950">{vehicle.assignedRoute}</span>
              </p>
            )}
          </div>

          <p className="text-justify pt-2">
            The bearer, who must show his identity card (TRACAS) is empowered to ply route assigned to him by the
            company.
          </p>

          <p className="text-justify font-medium">
            All law enforcement agents are hereby requested to render maximum assistance to the driver.
          </p>

          <p className="text-justify font-semibold pt-2">
            This letter of authority is issued on{" "}
            <span className="text-xs font-mono">{formatDateStr(vehicle.authorityIssueDate)}</span> and expires on{" "}
            <span className="text-xs font-mono">{formatDateStr(vehicle.authorityExpiryDate, "PERPETUAL")}</span>
          </p>
        </div>

        {/* Dual Signature Block */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-6 font-sans text-xs sm:text-sm">
          {/* Left Signatory: Ministry / SSG */}
          <div className="flex flex-col items-start">
            <div className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2">
              <span className="text-slate-400 font-mono text-[10px] italic mb-1">[DIGITAL SIGNATURE]</span>
            </div>
            <p className="font-bold text-slate-950 text-sm sm:text-base">Prof. Solo. Chukwulobulu</p>
            <p className="text-slate-700 font-medium">Secretary to the State Government</p>
            <p className="text-slate-500 text-xs">Anambra State Government</p>
          </div>

          {/* Right Signatory: TRACAS MD/CEO */}
          <div className="flex flex-col items-start">
            <div className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2">
              <span className="text-slate-400 font-mono text-[10px] italic mb-1">[DIGITAL SIGNATURE]</span>
            </div>
            <p className="font-bold text-slate-950 text-sm sm:text-base">Okeke Njideka</p>
            <p className="text-slate-700 font-medium">Ag. MD/CEO (TRACAS)</p>
            <p className="text-slate-950 font-mono font-bold">08034728664</p>
          </div>
        </div>


        {/* Bottom Bar Accent */}
        <div className="mt-10 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 bg-emerald-800 text-white text-center py-2.5 px-4 font-sans text-xs font-semibold tracking-wide print:-mx-0 print:-mb-0">
          All replies to be addressed to the Secretary to the State Government
        </div>
      </div>
    </div>
  );
}
