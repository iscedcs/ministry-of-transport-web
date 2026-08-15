/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

/** Official contact address printed on the Ministry letterhead. */
const MINISTRY_EMAIL = "mot@anambrastate.gov.ng";

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
  letterStatus?:
    | "PENDING_MD_APPROVAL"
    | "PENDING_COMMISSIONER_APPROVAL"
    | "APPROVED"
    | "DECLINED"
    | null;
  mdApprovedAt?: Date | string | null;
  commissionerApprovedAt?: Date | string | null;
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
  signatures,
  display,
}: {
  vehicle: LetterVehicleData;
  showActions?: boolean;
  /**
   * Base64 signature images, supplied by the authenticated server route.
   * Deliberately passed in rather than imported here so they never reach a
   * public bundle — see lib/signatures.ts.
   */
  signatures?: { commissioner: string; tracasMd: string };
  /**
   * Which optional blocks to print, from the admin settings screen. Resolved
   * server-side and passed in so this stays a pure render. Defaults match the
   * declared defaults in lib/system-config.ts, so a caller that has not been
   * updated still prints the currently-agreed letter.
   */
  display?: {
    showOwnerName?: boolean;
    showDriverName?: boolean;
    showQrCode?: boolean;
  };
}) {
  const driver = vehicle.assignedDriver;

  // TRACAS asked for the owner to come off the letter; it is a setting rather
  // than a deletion so the Ministry can put it back without a deployment.
  const showOwnerName = display?.showOwnerName ?? false;
  const showDriverName = display?.showDriverName ?? true;
  const showQrCode = display?.showQrCode ?? true;

  // A signature only appears once that office has actually signed.
  const status = vehicle.letterStatus ?? "PENDING_MD_APPROVAL";
  const mdSigned =
    status === "PENDING_COMMISSIONER_APPROVAL" || status === "APPROVED";
  const commissionerSigned = status === "APPROVED";
  const isDraft = status !== "APPROVED";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://ministry-of-transport-web.vercel.app");

  const publicVerificationUrl = `${baseUrl}/verify/tracas/${vehicle.authorityRef}`;

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

  // Expiry rule: the authority runs to the vehicle's PARTICULARS expiry, not
  // the driver's licence expiry — the letter authorises the vehicle, and a
  // driver can be reassigned without the authority lapsing.
  const getAuthorityExpiryFormatted = () => {
    const rawExpiry =
      vehicle.particularsExpiryDate || vehicle.authorityExpiryDate;
    if (!rawExpiry || rawExpiry === "PERPETUAL") return "N/A";
    try {
      const d = new Date(rawExpiry);
      if (!isNaN(d.getTime())) {
        return format(d, "dd MMMM yyyy");
      }
    } catch {
      // Fallback below
    }
    return String(rawExpiry);
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
  const expiryDateFormatted = getAuthorityExpiryFormatted();

  return (
    <div id="letter-print-root" className="flex flex-col items-center">
      {/* Print rules — force the whole letter onto a single A4 page.
          Everything outside #letter-of-authority-sheet is hidden, layout
          wrappers are reset, and vertical rhythm is compacted so the
          signature block and footer never spill onto page 2. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }

            /* Hide app chrome and everything that is not the letter */
            aside, header, nav, .no-print { display: none !important; }
            body * { visibility: hidden !important; }
            #letter-of-authority-sheet,
            #letter-of-authority-sheet * { visibility: visible !important; }

            /* Reset Next.js layout containers so nothing forces extra height.
               Hidden-but-present ancestors still occupy space and would emit
               blank pages, so every wrapper around the letter is collapsed. */
            html, body, body > div, main, #letter-print-root,
            div:has(> #letter-print-root),
            div:has(#letter-print-root) {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            /* The sheet becomes the page.
               min-height fills the printable area (A4 297mm less the 8mm
               margins, minus a 7mm safety gutter so rounding can never tip
               into a second page) — this is what lets the flex column push
               the signature block down to the foot of the letter. */
            #letter-of-authority-sheet {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: 265mm !important;
              height: auto !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              margin: 0 !important;
              padding: 26px 20px 0 20px !important;
              border: none !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              font-size: 10pt !important;
              line-height: 1.28 !important;
            }

            /* ── Vertical compaction ─────────────────────────────────── */
            #letter-of-authority-sheet [data-lp="letterhead"] {
              margin-bottom: 4px !important;
            }
            #letter-of-authority-sheet [data-lp="lh-title"] {
              font-size: 13.5pt !important;
            }
            #letter-of-authority-sheet [data-lp="lh-subtitle"] {
              font-size: 11pt !important;
              margin-top: 0 !important;
            }
            #letter-of-authority-sheet [data-lp="lh-crest"] {
              width: 56px !important;
              height: 56px !important;
            }
            #letter-of-authority-sheet [data-lp="lh-fields"] {
              margin-top: 6px !important;
            }
            #letter-of-authority-sheet [data-lp="ref-row"] {
              margin-top: 2px !important;
              margin-bottom: 2px !important;
            }
            #letter-of-authority-sheet [data-lp="qr"] {
              width: 70px !important;
              height: 70px !important;
            }
            #letter-of-authority-sheet [data-lp="photo"] {
              width: 70px !important;
              height: 84px !important;
            }
            #letter-of-authority-sheet [data-lp="title"] {
              margin-top: 2px !important;
              margin-bottom: 4px !important;
            }
            #letter-of-authority-sheet [data-lp="title"] h2 {
              font-size: 15pt !important;
            }
            #letter-of-authority-sheet [data-lp="body"] > * + * {
              margin-top: 4px !important;
            }
            #letter-of-authority-sheet [data-lp="particulars"] > * + * {
              margin-top: 1px !important;
            }
            #letter-of-authority-sheet [data-lp="particulars"] {
              padding-top: 2px !important;
              padding-bottom: 2px !important;
            }
            /* Signatures sit at the foot of the page — mt:auto absorbs the
               slack so the block lands just above the footer bar, with a
               generous rule for a real pen signature. */
            #letter-of-authority-sheet [data-lp="signatures"] {
              margin-top: auto !important;
              padding-top: 12px !important;
            }
            #letter-of-authority-sheet [data-lp="signatures"] [data-lp="sig-line"] {
              height: 42px !important;
              width: 200px !important;
            }
            #letter-of-authority-sheet [data-lp="frame"] {
              inset: 6px !important;
              border-radius: 30px !important;
            }
            #letter-of-authority-sheet [data-lp="footer"] {
              margin: 8px -14px 6px -14px !important;
              padding: 4px 12px !important;
              border-radius: 0 0 28px 28px !important;
              font-size: 8.5pt !important;
            }

            /* Signature images and the draft watermark must survive to paper */
            #letter-of-authority-sheet [data-lp="sig-img"],
            #letter-of-authority-sheet [data-lp="watermark"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #letter-of-authority-sheet [data-lp="sig-img"] {
              max-height: 56px !important;
            }
            #letter-of-authority-sheet [data-lp="ref-row"] img[alt="Tracas Official Logo"] {
              width: 68px !important;
              height: 34px !important;
            }
            #letter-of-authority-sheet [data-lp="approval-trail"] {
              margin-top: 6px !important;
              padding-top: 4px !important;
            }

            /* Keep the emerald footer bar and coloured headings in the PDF */
            #letter-of-authority-sheet [data-lp="footer"],
            #letter-of-authority-sheet [data-lp="frame"],
            #letter-of-authority-sheet [data-lp="lh-title"],
            #letter-of-authority-sheet [data-lp="lh-subtitle"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
        }}
      />

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
        {/* Rounded frame, as on the pre-printed sheet. Drawn as an overlay so
            it traces the page edge without disturbing content flow. The top
            edge is interrupted by the heading, which sits on it. */}
        <div
          data-lp="frame"
          className="pointer-events-none absolute inset-3 sm:inset-5 rounded-[2.25rem] border-[1.5px]"
          style={{ borderColor: "#1f5138" }}>
          {/* The heading sits ON the top border, breaking the line either
              side exactly as the printed sheet does. */}
          <h1
            data-lp="lh-title"
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-center text-[14px] sm:text-[18px] font-bold tracking-tight text-slate-900 uppercase leading-none whitespace-nowrap"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            Government of Anambra State of Nigeria
          </h1>
        </div>

        {/* Draft watermark — an unsigned letter must never be mistakable for
            an executed one, on screen or on paper. */}
        {isDraft && (
          <div
            data-lp="watermark"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10">
            <span className="rotate-[-30deg] text-[64px] sm:text-[86px] font-black uppercase tracking-widest text-red-600/12 border-[6px] border-red-600/12 px-8 py-3 rounded-2xl whitespace-nowrap">
              {status === "DECLINED" ? "Declined" : "Draft — Not Valid"}
            </span>
          </div>
        )}

        {/* Main Upper Content Wrapper */}
        <div className="flex-1 flex flex-col justify-start">
          {/* ── OFFICIAL LETTERHEAD ──────────────────────────────────
              Reproduces the Ministry's pre-printed sheet: rounded frame,
              both heading lines, coat of arms, and the E-mail/Tel/Ref block
              on the left with the secretariat address and Date on the right.
              Rebuilt in markup rather than dropped in as the supplied photo,
              which is ~78 DPI and would print soft. */}
          <div data-lp="letterhead" className="relative">
            <h2
              data-lp="lh-subtitle"
              className="text-center text-[12px] sm:text-[15px] font-bold uppercase tracking-wide mt-1"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#8a6d1f",
              }}>
              Ministry of Transport
            </h2>

            {/* Reference block, coat of arms, address */}
            <div
              data-lp="lh-fields"
              className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 mt-3 px-2">
              {/* Left — contact and references */}
              <div
                className="space-y-1.5 text-[10px] sm:text-[11px] text-slate-700"
                style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                <p>
                  <span>E-mail:</span>{" "}
                  <span className="text-slate-900">
                    {MINISTRY_EMAIL}
                  </span>
                </p>
                <p>
                  <span>Tel:</span>
                </p>
                <p className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Your Ref:</span>
                  <span className="flex-1 border-b border-dotted border-slate-400" />
                </p>
                <p className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Our Ref:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {vehicle.authorityRef}
                  </span>
                  <span className="flex-1 border-b border-dotted border-slate-400" />
                </p>
              </div>

              {/* Centre — coat of arms */}
              <img
                data-lp="lh-crest"
                src="/letter-head/coat-of-arms.png"
                alt="Coat of Arms of the Federal Republic of Nigeria"
                className="w-[74px] h-[74px] object-contain mt-0.5"
              />

              {/* Right — secretariat address and date, sitting at the outer
                  edge as on the printed sheet rather than hugging the crest */}
              <div
                className="justify-self-end text-[10px] sm:text-[11px] text-slate-700 leading-snug text-left"
                style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                <p>Chief Jerome Udoji Secretariat</p>
                <p>Complex</p>
                <p>Awka</p>
                <p className="mt-3">
                  <span>Date:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {vehicle.authorityIssueDate
                      ? format(
                          new Date(vehicle.authorityIssueDate),
                          "dd MMMM yyyy",
                        )
                      : format(new Date(), "dd MMMM yyyy")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Verification QR, TRACAS mark and driver photograph.
              These sat beside the old reference block; the letterhead now
              carries the references, so they keep their own row. */}
          <div
            data-lp="ref-row"
            className="flex items-start justify-between my-4 px-2">
            {showQrCode ? (
              <div className="flex flex-col items-center">
                <div
                  data-lp="qr"
                  className="w-28 h-28 border border-slate-900 p-1 bg-white shadow-xs">
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
            ) : (
              // Keeps the row's three-way spacing when the QR is switched off.
              <div aria-hidden />
            )}

            <div className="flex flex-col items-center space-y-2">
              <div className="h-10 flex items-center justify-center">
                <img
                  src="/tracas_logo-transparent.png"
                  alt="Tracas Official Logo"
                  className="w-24 h-12 object-contain filter drop-shadow-sm"
                />
              </div>

              <div className="flex flex-col items-center">
                <div
                  data-lp="photo"
                  className="w-28 h-32 border border-slate-900 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-xs">
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
          <div data-lp="title" className="text-center my-5">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider underline decoration-2 underline-offset-4 text-slate-950">
              TO WHOM IT MAY CONCERN
            </h2>
          </div>

          {/* Legal Text & Particulars Body */}
          <div
            data-lp="body"
            className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-900 font-serif">
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
              Transport Company of Anambra State (TRACAS). All relevant
              documents / particulars of the said vehicle remain with the above
              authority.
            </p>

            <div data-lp="particulars" className="space-y-2 py-2 font-serif">
              {showDriverName && (
                <p>
                  <span className="font-semibold">Driver&apos;s Name:</span>{" "}
                  <span className="font-bold text-slate-950">
                    {driver?.fullName || "Unassigned"}
                  </span>
                </p>
              )}

              {showOwnerName && vehicle.ownerName && (
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
                <span className="font-mono">
                  {vehicle.engineNumber || "N/A"}
                </span>{" "}
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
              The bearer, who must show his identity card (TRACAS) is empowered
              to ply route assigned to him by the company.
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
        <div
          data-lp="signatures"
          className="grid grid-cols-2 gap-8 mt-auto pt-10 font-sans text-xs sm:text-sm">
          {/* Left Signatory: Ministry / SSG */}
          <div className="flex flex-col items-start">
            <div
              data-lp="sig-line"
              className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2 relative">
              {commissionerSigned && signatures?.commissioner ? (
                <img
                  src={signatures.commissioner}
                  alt="Commissioner signature"
                  data-lp="sig-img"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-[52px] w-auto object-contain"
                />
              ) : (
                <span className="text-slate-400 font-mono text-[10px] italic mb-1">
                  [AWAITING SIGNATURE]
                </span>
              )}
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
            <div
              data-lp="sig-line"
              className="h-12 w-36 border-b border-dashed border-slate-400 flex items-end justify-center mb-2 relative">
              {mdSigned && signatures?.tracasMd ? (
                <img
                  src={signatures.tracasMd}
                  alt="Ag. MD/CEO signature"
                  data-lp="sig-img"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-[52px] w-auto object-contain"
                />
              ) : (
                <span className="text-slate-400 font-mono text-[10px] italic mb-1">
                  [AWAITING SIGNATURE]
                </span>
              )}
            </div>
            <p className="font-bold text-slate-950 text-sm sm:text-base">
              Okeke Njideka
            </p>
            <p className="text-slate-700 font-medium">Ag. MD/CEO (TRACAS)</p>
            <p className="text-slate-950 font-mono font-bold">08034728664</p>
          </div>
        </div>

        {/* Bottom Bar Accent */}
        {/* Approval trail */}
        <div
          data-lp="approval-trail"
          className="mt-3 pt-2 border-t border-slate-200 font-sans text-[9px] text-slate-500 flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            MD approval:{" "}
            <strong className="text-slate-700">
              {vehicle.mdApprovedAt
                ? formatDateStr(vehicle.mdApprovedAt)
                : "pending"}
            </strong>
          </span>
          <span>
            Commissioner approval:{" "}
            <strong className="text-slate-700">
              {vehicle.commissionerApprovedAt
                ? formatDateStr(vehicle.commissionerApprovedAt)
                : "pending"}
            </strong>
          </span>
        </div>

        <div
          data-lp="footer"
          className="relative z-10 mt-6 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 rounded-b-[2.15rem] text-white text-center py-2 px-4 font-sans text-[11px] font-semibold italic tracking-wide"
          style={{ backgroundColor: "#1f5138" }}>
          All replies to be addressed to the Hon. Commissioner
        </div>
      </div>
    </div>
  );
}
