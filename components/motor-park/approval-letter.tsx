"use client";

import { PrintButton } from "@/components/ui/print-button";
import {
  LetterheadFrame,
  LetterheadHeader,
  LetterheadFooter,
  letterheadPrintCss,
} from "@/components/ui/ministry-letterhead";

/**
 * Motor park approval letter — one document, two outcomes.
 *
 * There was no full-approval letter at all: only a temporal certificate, drawn
 * on its own black-bordered design rather than the Ministry letterhead, and
 * signed with the word "Patricia" typed in italic. This replaces it with the
 * real letterhead and covers both decisions, exactly as the revalidation
 * certificate does.
 */

export interface ApprovalLetterData {
  parkName: string;
  ownerName: string | null;
  location: string | null;
  /** ANS-MOT-PK-###### once assigned. */
  parkId: string | null;
  permitNumber: string | null;
  /** "TEMPORAL" | "PERMANENT" */
  approvalType: "TEMPORAL" | "PERMANENT";
  issuedAt: Date | string | null;
  validUntil: Date | string | null;
  validityMonths: number;
  /** Monthly operational fee in kobo, if assessed. */
  monthlyFeeKobo: number | null;
  /** Conditions the park must satisfy — the point of a temporal approval. */
  conditions?: string | null;
  commissionerName: string;
}

const fmt = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const naira = (kobo: number | null) =>
  kobo == null
    ? null
    : `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

function periodLabel(months: number): string {
  if (months <= 0) return "—";
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y} year${y === 1 ? "" : "s"}`;
  }
  return `${months} months`;
}

const Blank = ({ width = "10rem" }: { width?: string }) => (
  <span
    className="inline-block border-b border-dotted border-slate-400 align-baseline"
    style={{ width }}
  />
);

export function MotorParkApprovalLetter({
  data,
  signature,
  showActions = true,
}: {
  data: ApprovalLetterData;
  /** Base64 image, injected by the authenticated server route. */
  signature?: string;
  showActions?: boolean;
}) {
  const isTemporal = data.approvalType === "TEMPORAL";
  const issued = Boolean(data.permitNumber);
  const fee = naira(data.monthlyFeeKobo);

  return (
    <>
      {showActions && (
        <div className="mb-4 flex w-full max-w-[800px] items-center justify-end print:hidden">
          <PrintButton />
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: letterheadPrintCss("motor-park-letter-sheet"),
        }}
      />

      <div
        id="motor-park-letter-sheet"
        className="relative flex min-h-[1050px] w-full max-w-[800px] flex-col justify-between border border-slate-300 bg-white p-8 text-slate-900 shadow-2xl sm:p-12 print:m-0 print:min-h-0 print:w-full print:max-w-none print:border-none print:p-0 print:shadow-none"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <LetterheadFrame />

        {!issued && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
            <span className="whitespace-nowrap rounded-2xl border-[6px] border-red-600/12 px-8 py-3 text-[64px] font-black uppercase tracking-widest text-red-600/12 sm:text-[86px]">
              Draft — Not Valid
            </span>
          </div>
        )}

        <div className="flex flex-1 flex-col justify-start">
          <LetterheadHeader
            ourRef={data.permitNumber ?? data.parkId}
            date={data.issuedAt}
          />

          {/* Addressee */}
          <div className="mt-6 space-y-0.5 text-sm leading-relaxed sm:text-[15px]">
            <p className="font-semibold">The Proprietor / Manager,</p>
            <p className="font-semibold">{data.parkName}</p>
            {data.ownerName && <p>{data.ownerName}</p>}
            <p>{data.location || <Blank width="14rem" />}</p>
          </div>

          <h3 className="mt-5 text-sm font-bold uppercase leading-snug underline decoration-2 underline-offset-4 sm:text-base">
            {isTemporal
              ? "Temporary Approval to Operate a Motor Park"
              : "Approval to Operate a Motor Park"}
          </h3>

          <div className="mt-3 space-y-3 text-justify text-sm leading-relaxed sm:text-[15px]">
            <p>
              Following the Ministry&apos;s inspection and assessment of your
              facility, I am directed to inform you that the Ministry has
              granted{" "}
              <span className="font-semibold">
                {isTemporal ? "TEMPORARY" : "FULL "}APPROVAL
              </span>{" "}
              for the operation of{" "}
              <span className="font-semibold">{data.parkName}</span>
              {data.location ? (
                <>
                  {" "}
                  situated at{" "}
                  <span className="font-semibold">{data.location}</span>
                </>
              ) : null}
              , with effect from{" "}
              <span className="font-semibold">{fmt(data.issuedAt)}</span>.
            </p>

            <p>
              2. This approval is valid for{" "}
              <span className="font-semibold">
                {periodLabel(data.validityMonths)}
              </span>
              , expiring on{" "}
              <span className="font-semibold">{fmt(data.validUntil)}</span>.
              {isTemporal ? (
                <>
                  {" "}
                  It permits you to continue operations while the outstanding
                  requirements set out below are met, and{" "}
                  <span className="font-semibold">
                    does not constitute a full approval
                  </span>
                  . A full approval must be obtained before this date, failing
                  which the authority to operate lapses.
                </>
              ) : (
                <>
                  {" "}
                  It shall be subject to revalidation as the Ministry may deem
                  fit and in line with extant Transport Laws and Regulations.
                </>
              )}
            </p>

            {fee && (
              <p>
                3. You are to continue the payment of the monthly motor park
                (operational) fee of{" "}
                <span className="font-semibold">{fee}</span> as assessed by the
                Ministry.
              </p>
            )}

            {isTemporal && data.conditions && (
              <div>
                <p className="font-semibold">
                  {fee ? "4." : "3."} Outstanding requirements:
                </p>
                <p className="mt-1 whitespace-pre-wrap pl-4">
                  {data.conditions}
                </p>
              </div>
            )}

            <p>
              You are advised to display this letter conspicuously at the park
              and to produce it on demand by any authorised officer of the
              Ministry.
            </p>

            <p>Please accept the assurances of the Ministry&apos;s esteem.</p>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-8 flex flex-col items-start">
          {signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signature}
              alt="Commissioner's signature"
              className="mb-1 h-[54px] object-contain"
            />
          ) : (
            <div className="h-[54px]" />
          )}
          <div className="border-t border-slate-900 pt-1">
            <p className="text-sm font-bold">{data.commissionerName}</p>
            <p className="text-xs text-slate-700">
              Hon. Commissioner for Transport
            </p>
            <p className="text-xs text-slate-700">Anambra State</p>
          </div>

          {data.parkId && (
            <p className="mt-4 font-mono text-[11px] text-slate-600">
              Park ID: {data.parkId}
            </p>
          )}
        </div>

        <LetterheadFooter />
      </div>
    </>
  );
}
