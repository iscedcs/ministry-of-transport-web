/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * Revalidation certificate — the Ministry's "Revalidation of your Authority to
 * Operate" letter, rendered on the official letterhead.
 *
 * The letterhead chrome (green frame, heading, crest, ref block, footer band)
 * mirrors components/tracas/letter-of-authority.tsx. It is duplicated rather
 * than shared because that letter is already in production use and printing
 * correctly; extracting a common component is worth doing, but not while both
 * documents are being actively signed off.
 *
 * Everything the Ministry fills in by hand on the paper original is dynamic
 * here: addressee, park name and location, Private/Public wording, effective
 * date, the monthly operational fee (single or reviewed from→to), and the
 * facilities required within six months.
 */

import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const MINISTRY_EMAIL = "mot@anambrastate.gov.ng";

export interface RevalidationCertificateData {
  id: string;
  revalidationNumber: string | null;
  parkName: string;
  ownerName: string;
  representativeName: string | null;
  residentialAddress: string | null;
  physicalLocation: string | null;
  townCommunity: string | null;
  lga: string | null;
  /** "Public" | "Private" | "Loading Bay" — drives the wording. */
  facilityType: string | null;
  approvedAt: Date | string | null;
  validUntil: Date | string | null;
  effectiveFrom: Date | string | null;
  monthlyFeeAmount: number | null;
  previousMonthlyFeeAmount: number | null;
  requiredFacilities: string | null;
  commissionerApprovedAt: Date | string | null;
  /** "TEMPORAL" | "PERMANENT" — set by the Commissioner at final approval. */
  approvalType?: string | null;
}

/** Kobo → "₦12,000.00". Amounts are stored in kobo throughout the platform. */
const naira = (kobo: number | null | undefined) =>
  kobo === null || kobo === undefined
    ? null
    : `₦${(kobo / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

/** Number to words, for the "( naira only)" phrasing on the paper original. */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function inWords(n: number): string {
  if (n === 0) return "Zero";
  const chunk = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return ONES[num];
    if (num < 100)
      return `${TENS[Math.floor(num / 10)]}${num % 10 ? ` ${ONES[num % 10]}` : ""}`;
    return `${ONES[Math.floor(num / 100)]} Hundred${
      num % 100 ? ` and ${chunk(num % 100)}` : ""
    }`;
  };
  const scales: [number, string][] = [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ];
  let rest = Math.floor(n);
  const parts: string[] = [];
  for (const [value, name] of scales) {
    if (rest >= value) {
      parts.push(`${chunk(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(chunk(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const fmtLong = (d: Date | string | null | undefined, fallback = "—") => {
  if (!d) return fallback;
  const date = new Date(d);
  if (isNaN(date.getTime())) return fallback;
  return format(date, "do MMMM, yyyy");
};

/** Dotted rule standing in for a value the Ministry has not supplied. */
function Blank({ width = "9rem" }: { width?: string }) {
  return (
    <span
      className="inline-block border-b border-dotted border-slate-500 align-baseline"
      style={{ width, minWidth: width }}
    />
  );
}

export function RevalidationCertificate({
  application,
  showActions = true,
  signature,
}: {
  application: RevalidationCertificateData;
  showActions?: boolean;
  /** Commissioner signature, injected by the authenticated server route. */
  signature?: string;
}) {
  const a = application;

  const issued = a.commissionerApprovedAt ?? a.approvedAt;

  // A temporal approval is a permission to keep operating while something is
  // put right. It must never read like a full revalidation on paper.
  const isTemporal = a.approvalType === "TEMPORAL";
  const isIssued = !!a.revalidationNumber && !!issued;

  const effective = a.effectiveFrom ?? a.validUntil ?? null;

  // "Private Park/Public Park" on the paper original — we print whichever the
  // applicant actually selected, and fall back to the slash form if unknown.
  const facility = (a.facilityType ?? "").trim().toLowerCase();
  const parkKind =
    facility === "private"
      ? "Private Park"
      : facility === "public"
        ? "Public Park"
        : facility === "loading bay"
          ? "Loading Bay"
          : "Private Park/Public Park";
  const headingKind =
    facility === "private"
      ? "PRIVATE"
      : facility === "public"
        ? "PUBLIC"
        : facility === "loading bay"
          ? "LOADING BAY"
          : "PRIVATE/PUBLIC";

  const locParts = [
    a.physicalLocation?.trim(),
    a.townCommunity?.trim(),
    a.lga?.trim(),
  ].filter(Boolean);
  const location = locParts.length > 0 ? locParts.join(", ") : null;

  const feeNow = naira(a.monthlyFeeAmount);
  const feePrev = naira(a.previousMonthlyFeeAmount);
  const feeWords =
    a.monthlyFeeAmount != null
      ? `${inWords(a.monthlyFeeAmount / 100)} Naira only`
      : null;
  const wasReviewed = a.previousMonthlyFeeAmount != null && feePrev !== feeNow;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div id="cert-print-root" className="flex flex-col items-center">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }

            aside, header, nav, .no-print { display: none !important; }
            body * { visibility: hidden !important; }
            #revalidation-certificate-sheet,
            #revalidation-certificate-sheet * { visibility: visible !important; }

            html, body, body > div, main, #cert-print-root,
            div:has(> #cert-print-root),
            div:has(#cert-print-root) {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            #revalidation-certificate-sheet {
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
              font-size: 10.5pt !important;
              line-height: 1.4 !important;
            }

            #revalidation-certificate-sheet [data-c="frame"] {
              inset: 6px !important;
              border-radius: 30px !important;
            }
            #revalidation-certificate-sheet [data-c="title"] {
              font-size: 13.5pt !important;
            }
            #revalidation-certificate-sheet [data-c="subtitle"] {
              font-size: 11pt !important;
              margin-top: 0 !important;
            }
            #revalidation-certificate-sheet [data-c="crest"] {
              width: 56px !important;
              height: 56px !important;
            }
            #revalidation-certificate-sheet [data-c="body"] > * + * {
              margin-top: 7px !important;
            }
            #revalidation-certificate-sheet [data-c="sig-img"] {
              max-height: 58px !important;
            }
            #revalidation-certificate-sheet [data-c="footer"] {
              margin: 8px -14px 6px -14px !important;
              padding: 4px 12px !important;
              border-radius: 0 0 28px 28px !important;
              font-size: 8.5pt !important;
            }
            #revalidation-certificate-sheet [data-c="footer"],
            #revalidation-certificate-sheet [data-c="frame"],
            #revalidation-certificate-sheet [data-c="title"],
            #revalidation-certificate-sheet [data-c="subtitle"],
            #revalidation-certificate-sheet [data-c="sig-img"],
            #revalidation-certificate-sheet [data-c="watermark"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
        }}
      />

      {showActions && (
        <div className="w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden bg-card p-4 rounded-xl border border-border shadow-sm">
          <Link
            href="/admin/revalidation-queue"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to revalidation queue
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:bg-primary/90 transition-colors text-sm cursor-pointer">
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      )}

      <div
        id="revalidation-certificate-sheet"
        className="w-full max-w-[800px] min-h-[1050px] bg-white text-slate-900 border border-slate-300 p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {/* Letterhead frame with the heading straddling its top edge */}
        <div
          data-c="frame"
          className="pointer-events-none absolute inset-3 sm:inset-5 rounded-[2.25rem] border-[1.5px]"
          style={{ borderColor: "#1f5138" }}>
          <h1
            data-c="title"
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-center text-[14px] sm:text-[18px] font-bold tracking-tight text-slate-900 uppercase leading-none whitespace-nowrap"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            Government of Anambra State of Nigeria
          </h1>
        </div>

        {!isIssued && (
          <div
            data-c="watermark"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10">
            <span className="rotate-[-30deg] text-[64px] sm:text-[86px] font-black uppercase tracking-widest text-red-600/12 border-[6px] border-red-600/12 px-8 py-3 rounded-2xl whitespace-nowrap">
              Draft — Not Valid
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-start">
          <h2
            data-c="subtitle"
            className="text-center text-[12px] sm:text-[15px] font-bold uppercase tracking-wide mt-1"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              color: "#8a6d1f",
            }}>
            Ministry of Transport
          </h2>

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 mt-3 px-2">
            <div
              className="space-y-1.5 text-[10px] sm:text-[11px] text-slate-700"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              <p>
                <span>E-mail:</span>{" "}
                <span className="text-slate-900">{MINISTRY_EMAIL}</span>
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
                  {a.revalidationNumber ?? "AN/MOT/"}
                </span>
                <span className="flex-1 border-b border-dotted border-slate-400" />
              </p>
            </div>

            <img
              data-c="crest"
              src="/anambra_mot_logo.png"
              alt="Coat of Arms of the Federal Republic of Nigeria"
              className="w-[74px] h-[74px] object-contain mt-0.5"
            />

            <div
              className="justify-self-end text-[10px] sm:text-[11px] text-slate-700 leading-snug text-left"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              <p>Chief Jerome Udoji Secretariat</p>
              <p>Complex</p>
              <p>Awka</p>
              <p className="mt-3">
                <span>Date:</span>{" "}
                <span className="font-semibold text-slate-900">
                  {fmtLong(issued, format(new Date(), "do MMMM, yyyy"))}
                </span>
              </p>
            </div>
          </div>

          {/* Addressee */}
          <div className="mt-6 text-sm leading-relaxed">
            <p className="font-semibold">{a.ownerName}</p>
            {a.representativeName && <p>{a.representativeName}</p>}
            {a.residentialAddress && <p>{a.residentialAddress}</p>}
            {location && location !== a.residentialAddress && <p>{location}</p>}
          </div>

          {/* Subject */}
          <h3 className="mt-5 text-sm sm:text-base font-bold underline decoration-2 underline-offset-4 uppercase leading-snug">
            {isTemporal ? "Temporary Approval of" : "Revalidation of"} your{" "}
            {headingKind} Motor Park at {location || "…"}
          </h3>

          <div
            data-c="body"
            className="mt-3 space-y-3 text-sm sm:text-[15px] leading-relaxed text-justify">
            <p>
              Further to the Ministry&apos;s Inspection of your Motor
              Parks/Loading Bays, please be informed that the Ministry has
              granted you{" "}
              {isTemporal
                ? "TEMPORARY APPROVAL of"
                : "approved the Revalidation of"}{" "}
              for your <span className="font-semibold">{parkKind}</span>{" "}
              situated at{" "}
              <span className="font-semibold">
                {location || <Blank width="12rem" />}
              </span>{" "}
              local government area with effect from{" "}
              <span className="font-semibold">
                {effective ? fmtLong(effective) : <Blank width="8rem" />}
              </span>
              .{" "}
              {isTemporal ? (
                <>
                  This <span className="font-semibold"> TEMPORARY</span>{" "}
                  approval is valid until{" "}
                  <span className="font-semibold">
                    {a.validUntil ? (
                      fmtLong(a.validUntil)
                    ) : (
                      <Blank width="8rem" />
                    )}
                  </span>
                  , subject to your provision of the outstanding requirements in
                  No. 4 below. It does not constitute a full approval, and
                  lapses on that date unless a full approval is granted.
                </>
              ) : (
                <>
                  This approval shall be subject to revalidation as the Ministry
                  may deem fit and in line with extant Transport Laws and
                  Regulations.
                </>
              )}
            </p>

            {/* Fee — a single figure, or a review from → to */}
            {wasReviewed ? (
              <p>
                2. Upon reassessment of your motor park/loading bay, the
                Ministry has reviewed your monthly motor park (operational) fee
                from <span className="font-semibold">{feePrev}</span> to{" "}
                <span className="font-semibold">{feeNow}</span> with effect from{" "}
                <span className="font-semibold">
                  {effective ? fmtLong(effective) : <Blank width="8rem" />}
                </span>
                .
              </p>
            ) : (
              <p>
                2. You are to pay monthly motor park (operational) fee of{" "}
                <span className="font-semibold">
                  {feeNow ?? <Blank width="7rem" />}
                </span>{" "}
                {feeWords ? (
                  <span className="font-semibold">({feeWords})</span>
                ) : (
                  <>
                    (<Blank width="9rem" /> naira only)
                  </>
                )}
                in Anambra paydirect, using your company Asin.
              </p>
            )}

            <p>
              3. Please ensure that all loading/offloading activities of
              vehicles and/or cargo/logistics services are done within the
              park&apos;s premises and not on the adjoining road(s).
            </p>

            <p>
              4. In addition, kindly ensure that the facilities seen during
              Ministry&apos;s inspection are kept clean, well maintained,
              functional at all times and available for the use of commuters and
              drivers. You are to ensure the provision of the following
              facilities{" "}
              <span className="font-semibold">
                {a.requiredFacilities?.trim() || <Blank width="12rem" />}
              </span>{" "}
              within six (6) months period to avoid revocation of your
              {isTemporal ? " temporary approval" : " revalidation"}.
            </p>

            <p className="font-semibold italic">
              5. Failure to comply with the above will lead to withdrawal of
              this approval letter without prior notice.
            </p>

            <p>Congratulations and please accept my warm regards.</p>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-auto pt-6">
          <div className="h-14 w-48 flex items-end mb-1 relative">
            {a.commissionerApprovedAt && signature ? (
              <img
                data-c="sig-img"
                src={signature}
                alt="Commissioner signature"
                className="absolute bottom-0 left-0 max-h-[56px] w-auto object-contain"
              />
            ) : (
              <span className="text-slate-400 font-mono text-[10px] italic mb-1">
                [AWAITING SIGNATURE]
              </span>
            )}
          </div>
          <p className="font-bold text-sm sm:text-base text-slate-950">
            Hon. Edward Obiefuna Ibuzo
          </p>
          <p className="text-slate-700 font-medium text-sm">
            Honourable Commissioner
          </p>
          {a.validUntil && (
            <p className="text-[10px] text-slate-500 mt-2 font-sans">
              Certificate {a.revalidationNumber} · valid until{" "}
              {fmtLong(a.validUntil)}
            </p>
          )}
        </div>

        <div
          data-c="footer"
          className="relative z-10 mt-6 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 rounded-b-[2.15rem] text-white text-center py-2 px-4 font-sans text-[11px] font-semibold italic tracking-wide"
          style={{ backgroundColor: "#1f5138" }}>
          All replies to be addressed to the Hon. Commissioner
        </div>
      </div>
    </div>
  );
}
