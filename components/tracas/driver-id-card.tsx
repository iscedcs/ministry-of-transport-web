/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { format } from "date-fns";

export interface DriverIdCardData {
  id: string;
  fullName: string;
  securityCode?: string | null;
  photoUrl?: string | null;
  phoneNumber?: string | null;
  licenseNumber?: string | null;
  licenseIssueDate?: Date | string | null;
  licenseExpiryDate?: Date | string | null;
  operatorAssociation?: string | null;
  nin?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  stateOfOrigin?: string | null;
  lga?: string | null;
  residentialAddress?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
  idCardStatus?:
    | "PENDING_VIO_APPROVAL"
    | "PENDING_MD_APPROVAL"
    | "PENDING_COMMISSIONER_APPROVAL"
    | "APPROVED"
    | "DECLINED"
    | null;
  idMdApprovedAt?: Date | string | null;
  idCommissionerApprovedAt?: Date | string | null;
  vehicles?: {
    id: string;
    registrationNumber: string;
    fleetNumber: string;
  }[];
}

const fmt = (date: Date | string | null | undefined, fallback = "—") => {
  if (!date) return fallback;
  const d = new Date(date);
  return isNaN(d.getTime()) ? String(date) : format(d, "dd MMM yyyy");
};

/** One label/value line on the reverse. Values fall back to an em dash. */
function BackRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 leading-tight">
      <span className="text-[12px] font-extrabold uppercase tracking-wide text-gray-500 flex-shrink-0">
        {label}
      </span>
      <span className="text-[13px] font-bold text-slate-900 text-right truncate">
        {value || "—"}
      </span>
    </div>
  );
}

export function DriverIdCard({
  driver,
  signatures,
}: {
  driver: DriverIdCardData;
  /**
   * Base64 signature images supplied by the authenticated server route —
   * never imported here, so they cannot reach a public bundle.
   */
  signatures?: { commissioner: string; tracasMd: string };
}) {
  // A signature appears only once that office has actually signed. The VIO
  // stage is a verification gate and produces no signature.
  const idStatus = driver.idCardStatus ?? "PENDING_VIO_APPROVAL";
  const mdSigned =
    idStatus === "PENDING_COMMISSIONER_APPROVAL" || idStatus === "APPROVED";
  const commissionerSigned = idStatus === "APPROVED";
  const isDraftCard = idStatus !== "APPROVED";
  const securityCode = driver.securityCode || "0000";
  const now = new Date();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://ministry-of-transport-web.vercel.app");

  const publicVerificationUrl = `${baseUrl}/verify/tracas-driver/${driver.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(
    publicVerificationUrl,
  )}`;

  const issueDateStr = fmt(driver.createdAt, format(now, "dd MMM yyyy"));

  /**
   * The card runs to 31 December of the year it was issued, whenever in the
   * year the driver was onboarded. The Ministry renews the whole fleet on one
   * annual cycle, so a card that expired on its own anniversary would put
   * every driver on a different renewal date.
   *
   * Deliberately NOT licenseExpiryDate: that is the driver's own driving
   * licence, a separate document with its own expiry, and printing it here
   * made the card appear to run to whatever date DVLA had set.
   */
  const issuedAt = driver.createdAt ? new Date(driver.createdAt) : now;
  const expiryYear = Number.isNaN(issuedAt.getTime())
    ? now.getFullYear()
    : issuedAt.getFullYear();
  const expiryDateStr = `31 Dec ${expiryYear}`;

  const origin = [driver.lga, driver.stateOfOrigin].filter(Boolean).join(", ");
  const assignedVehicle = driver.vehicles?.[0];
  const emergencyName =
    driver.emergencyContactName || driver.nextOfKinName || null;
  const emergencyPhone =
    driver.emergencyContactPhone || driver.nextOfKinPhone || null;

  return (
    <div id="id-card-print-root" className="flex flex-col items-center">
      {/* Print rules — both faces on a single sheet, app chrome hidden. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            /* Both faces on ONE sheet, side by side. Each face is still
               exactly CR80 (ISO/IEC 7810 ID-1): laid out at twice CR80 at
               96dpi and scaled by 0.5, which lands it at 53.98 x 85.60 mm —
               an exact factor, not an approximation.

               The page was previously sized to a single card with a forced
               break between the faces, which is why the front and the back
               came out on two sheets. */
            @page { size: 120mm 92mm; margin: 3mm; }

            aside, header, nav, .no-print { display: none !important; }
            body * { visibility: hidden !important; }
            #id-card-sheet, #id-card-sheet * { visibility: visible !important; }

            html, body, body > div, main, #id-card-print-root,
            div:has(#id-card-print-root) {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            #id-card-sheet {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              /* 4mm between the two faces, so they can be guillotined apart
                 without cutting into either card. */
              gap: 4mm !important;
              display: flex !important;
              flex-wrap: nowrap !important;
              align-items: flex-start !important;
            }

            /* zoom, not transform: a transform leaves the element occupying
               its full 408x647px in layout, so each face overflowed onto a
               second sheet. zoom scales the layout box as well. */
            #id-card-sheet [data-face] {
              zoom: 0.5;
              box-shadow: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              flex: 0 0 auto !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
        }}
      />

      {isDraftCard && (
        <p className="print:hidden mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400">
          Not yet approved — signatures are applied as the Ag. MD/CEO and
          Commissioner sign. This card is not valid for issue.
        </p>
      )}

      {/* Both faces — side by side on screen and on paper */}
      <div
        id="id-card-sheet"
        className="flex flex-wrap items-start justify-center gap-8 print:flex-nowrap print:gap-0">
        {/* ══════════════════ FRONT ══════════════════ */}
        <div
          data-face="front"
          className="w-[408px] h-[647px] border-2 border-primary rounded-2xl overflow-hidden shadow-xl bg-white text-black flex flex-col"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          {/* Header Banner */}
          <div className="bg-primary text-primary-foreground px-3 py-2.5 text-center relative flex-shrink-0">
            <h2 className="font-extrabold uppercase text-sm leading-tight tracking-wide">
              Ministry of Transport
            </h2>
            <p className="text-[14px] uppercase opacity-90 font-semibold">
              Anambra State
            </p>
            <span className="absolute top-2.5 right-2 bg-emerald-500 text-white text-[13px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-xs">
              {driver.status === "ACTIVE" || !driver.status
                ? "Active"
                : driver.status}
            </span>
          </div>

          {/* Card Body */}
          <div className="flex-1 flex flex-col items-center px-5 pt-5 pb-4">
            {/* Driver Photo — the dominant element on the front */}
            <div className="w-[186px] h-[220px] rounded-xl overflow-hidden bg-gray-100 border-[3px] border-primary shadow-sm flex items-center justify-center flex-shrink-0">
              {driver.photoUrl ? (
                <img
                  src={driver.photoUrl}
                  className="w-full h-full object-cover"
                  alt={driver.fullName}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl font-extrabold text-gray-500">
                  {driver.fullName[0]}
                </div>
              )}
            </div>

            {/* Identity */}
            <h3 className="font-extrabold text-xl uppercase text-center leading-tight text-slate-900 mt-4 px-1">
              {driver.fullName}
            </h3>
            <p className="text-[15px] text-primary font-extrabold uppercase tracking-wider text-center mt-1">
              Commercial Driver
            </p>
            <p className="text-[15px] text-gray-600 font-bold text-center mt-0.5 truncate max-w-[330px]">
              {driver.operatorAssociation ||
                "Transport Company Of Anambra State"}
            </p>

            {/* Credentials */}
            <div className="w-full bg-gray-50 px-3 py-2.5 rounded-xl mt-4 space-y-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-extrabold uppercase">
                  Driver ID / Code
                </span>
                <span className="font-mono font-extrabold text-primary text-base tracking-wider">
                  {securityCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-extrabold uppercase">
                  License Number
                </span>
                <span className="font-mono font-bold text-slate-900 text-[15px]">
                  {driver.licenseNumber || "N/A"}
                </span>
              </div>
            </div>

            {/* Validity band pinned to the foot of the card */}
            <div className="mt-auto w-full flex justify-between items-center bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              <div className="text-left">
                <p className="text-[12px] uppercase font-extrabold text-gray-500 leading-none">
                  Issued
                </p>
                <p className="text-[14px] font-extrabold text-slate-900 mt-0.5">
                  {issueDateStr}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] uppercase font-extrabold text-gray-500 leading-none">
                  Expires
                </p>
                <p className="text-[14px] font-extrabold text-slate-900 mt-0.5">
                  {expiryDateStr}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════ BACK ══════════════════ */}
        <div
          data-face="back"
          className="w-[408px] h-[647px] border-2 border-primary rounded-2xl overflow-hidden shadow-xl bg-white text-black flex flex-col"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          {/* Slim header */}
          <div className="bg-primary text-primary-foreground px-3 py-1.5 text-center flex-shrink-0">
            <p className="text-[14px] font-extrabold uppercase tracking-wider">
              Driver Identity Card · Reverse
            </p>
          </div>

          <div className="flex-1 flex flex-col px-4 pt-3 pb-3">
            {/* QR verification block */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <img
                src={qrImageUrl}
                className="w-[92px] h-[92px] rounded border border-gray-300 flex-shrink-0"
                alt="Verification QR code"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold uppercase text-slate-900 leading-tight">
                  Scan to verify
                </p>
                <p className="text-[12px] text-gray-600 leading-snug mt-1">
                  Confirms this card against the Ministry of Transport register
                  in real time.
                </p>
                <p className="text-[12px] font-mono text-gray-500 mt-1.5">
                  REF: <span className="font-extrabold">{securityCode}</span>
                  {driver.nin ? ` · NIN ****${driver.nin.slice(-4)}` : ""}
                </p>
              </div>
            </div>

            {/* Holder particulars */}
            <div className="pt-2.5 space-y-1.5">
              <BackRow label="Date of Birth" value={fmt(driver.dateOfBirth)} />
              <BackRow label="Gender" value={driver.gender} />
              <BackRow label="Blood Group" value={driver.bloodGroup} />
              <BackRow label="Phone" value={driver.phoneNumber} />
              <BackRow label="Origin" value={origin} />
              <BackRow label="Address" value={driver.residentialAddress} />
              {/* <BackRow
                label="Assigned Vehicle"
                value={
                  assignedVehicle
                    ? `${assignedVehicle.registrationNumber} · ${assignedVehicle.fleetNumber}`
                    : null
                }
              /> */}
            </div>

            {/* Emergency contact */}
            <div className="mt-2.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
              <p className="text-[12px] font-extrabold uppercase text-red-700 tracking-wide">
                In case of emergency
              </p>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-[13px] font-bold text-slate-900 truncate">
                  {emergencyName || "—"}
                </span>
                <span className="text-[13px] font-mono font-extrabold text-slate-900 flex-shrink-0">
                  {emergencyPhone || "—"}
                </span>
              </div>
            </div>

            {/* Official signatures — Ag. MD/CEO and Commissioner. Each is
                applied only when that office has approved the card. */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="h-8 border-b border-gray-400 flex items-end justify-center relative">
                  {mdSigned && signatures?.tracasMd ? (
                    <img
                      src={signatures.tracasMd}
                      alt="Ag. MD/CEO signature"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-[34px] w-auto object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-gray-400 italic mb-0.5">
                      pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] uppercase font-extrabold text-gray-600 mt-0.5 leading-tight">
                  Ag. MD/CEO
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">TRACAS</p>
              </div>

              <div>
                <div className="h-8 border-b border-gray-400 flex items-end justify-center relative">
                  {commissionerSigned && signatures?.commissioner ? (
                    <img
                      src={signatures.commissioner}
                      alt="Commissioner signature"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-[34px] w-auto object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-gray-400 italic mb-0.5">
                      pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] uppercase font-extrabold text-gray-600 mt-0.5 leading-tight">
                  Commissioner
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Min. of Transport
                </p>
              </div>
            </div>

            {/* Conditions of use */}
            <p className="text-[11px] text-gray-600 leading-snug mt-auto pt-3">
              This card remains the property of the Anambra State Ministry of
              Transport and must be surrendered on demand. It is
              non-transferable and valid only with a subsisting driver&apos;s
              licence. If found, return to the Ministry of Transport, Government
              House, P.M.B. 5036, Awka.
            </p>
          </div>

          {/* Footer band */}
          <div className="bg-primary text-primary-foreground text-center py-1.5 px-2 flex-shrink-0">
            <p className="text-[12px] font-extrabold uppercase tracking-wide">
              ✓ Verified by Anambra State Ministry of Transport
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
