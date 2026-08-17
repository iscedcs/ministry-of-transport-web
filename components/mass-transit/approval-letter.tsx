"use client";

import { PrintButton } from "@/components/ui/print-button";
import {
  LetterheadFrame,
  LetterheadHeader,
  LetterheadFooter,
  letterheadPrintCss,
} from "@/components/ui/ministry-letterhead";

/**
 * Mass transit APPROVAL LETTER.
 *
 * Issued to the company, not to its terminals — the terminals receive their
 * own certificate. The letter conveys the decision, the permit number and the
 * monthly levy; the certificate is what a terminal displays.
 *
 * Same letterhead treatment as the TRACAS letter of authority so every
 * Ministry correspondence reads as one family: crest straddling a ruled frame,
 * references on the left, Commissioner's signature at the foot.
 */

export interface MassTransitLetterData {
  id: string;
  companyName: string;
  contactPerson: string;
  contactAddress: string | null;
  permitNumber: string | null;
  permitIssuedAt: Date | string | null;
  permitExpiresAt: Date | string | null;
  /** Kobo. */
  monthlyLevyAmount: number | null;
  approvedColour: string | null;
  fleetSize: number;
  terminals: { designation: string; location: string; parkId: string | null }[];
  approvalType: "TEMPORAL" | "PERMANENT";
  validityMonths: number;
}

const GREEN = "#1f5138";

const fmt = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "…………………………";

const naira = (kobo: number | null | undefined) =>
  kobo == null
    ? null
    : `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

function Blank({ width = "8rem" }: { width?: string }) {
  return (
    <span
      className="inline-block border-b border-dotted border-slate-500 align-baseline"
      style={{ width }}
    />
  );
}

export function MassTransitApprovalLetter({
  data,
  signature,
  showActions = true,
}: {
  data: MassTransitLetterData;
  signature?: string;
  showActions?: boolean;
}) {
  const issued = !!data.permitNumber;
  const isTemporal = data.approvalType === "TEMPORAL";
  const levy = naira(data.monthlyLevyAmount);

  return (
    <>
      {showActions && (
        <div className="mb-4 flex w-full max-w-[210mm] justify-end print:hidden">
          <PrintButton />
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: letterheadPrintCss("mt-letter-sheet"),
        }}
      />

      <div
        id="mt-letter-sheet"
        className="relative flex min-h-[1050px] w-full max-w-[800px] flex-col justify-between border border-slate-300 bg-white p-8 text-slate-900 shadow-2xl sm:p-12 print:m-0 print:min-h-0 print:w-full print:max-w-none print:border-none print:p-0 print:shadow-none"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <LetterheadFrame />

        {!issued && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="rotate-[-30deg] whitespace-nowrap rounded-2xl border-[6px] border-red-600/12 px-8 py-3 text-[58px] font-black uppercase tracking-widest text-red-600/12">
              Draft — Not Valid
            </span>
          </div>
        )}

        <div className="relative z-0 flex flex-1 flex-col">
          <LetterheadHeader
            ourRef={data.permitNumber}
            date={data.permitIssuedAt}
          />

          {/* Addressee */}
          <div className="mt-6 space-y-0.5 text-[13px] font-semibold">
            <p>The Managing Director,</p>
            <p className="uppercase">{data.companyName}</p>
            {data.contactAddress && (
              <p className="font-normal">{data.contactAddress}</p>
            )}
          </div>

          <h3 className="mt-5 text-center text-sm font-bold uppercase underline decoration-2 underline-offset-4 sm:text-base">
            {isTemporal
              ? "Temporal Approval to Operate Mass Transit Services"
              : "Approval to Operate Mass Transit Services"}
          </h3>

          <div className="mt-3 space-y-3 text-justify text-sm leading-relaxed sm:text-[15px]">
            <p>
              I am directed to inform you that the Ministry has{" "}
              {isTemporal ? (
                <>
                  granted{" "}
                  <span className="font-semibold">TEMPORAL APPROVAL</span> to
                </>
              ) : (
                <>approved the application of</>
              )}{" "}
              <span className="font-semibold uppercase">
                {data.companyName}
              </span>{" "}
              to operate mass transit services within Anambra State, with effect
              from{" "}
              <span className="font-semibold">{fmt(data.permitIssuedAt)}</span>.
            </p>

            <p>
              2. Your Permit to Operate is{" "}
              <span className="font-mono font-semibold">
                {data.permitNumber ?? <Blank width="10rem" />}
              </span>
              , valid until{" "}
              <span className="font-semibold">{fmt(data.permitExpiresAt)}</span>{" "}
              ({data.validityMonths} months)
              {isTemporal
                ? ". This is a temporal approval, granted to permit operations while the outstanding requirements identified at inspection are met, and it lapses on that date unless full approval is granted."
                : "."}
            </p>

            <p>
              3. This approval covers{" "}
              <span className="font-semibold">{data.fleetSize}</span> vehicle
              {data.fleetSize === 1 ? "" : "s"}
              {data.approvedColour ? (
                <>
                  , which shall carry the approved livery{" "}
                  <span className="font-semibold">{data.approvedColour}</span>
                </>
              ) : null}
              . Any vehicle added to the fleet must be submitted to the Ministry
              for registration before it is put into service.
            </p>

            {levy && (
              <p>
                4. You are to pay a monthly operational levy of{" "}
                <span className="font-semibold">{levy}</span> in respect of this
                approval.
              </p>
            )}

            {/* Terminals — each is a registered park in its own right. */}
            {data.terminals.length > 0 && (
              <div>
                <p>
                  {levy ? "5." : "4."} The following terminal
                  {data.terminals.length === 1 ? " is" : "s are"} registered
                  under this approval, and{" "}
                  {data.terminals.length === 1 ? "holds its" : "each holds its"}{" "}
                  own Park Revalidation Certificate:
                </p>
                <table className="mt-2 w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-y border-slate-400">
                      <th className="py-1 pr-2 text-left font-bold">
                        Terminal
                      </th>
                      <th className="py-1 pr-2 text-left font-bold">
                        Location
                      </th>
                      <th className="py-1 text-left font-bold">Park ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.terminals.map((t) => (
                      <tr
                        key={t.designation}
                        className="border-b border-slate-200">
                        <td className="py-1 pr-2 font-semibold">
                          {t.designation}
                        </td>
                        <td className="py-1 pr-2">{t.location}</td>
                        <td className="py-1 font-mono">{t.parkId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p>
              This approval is subject to compliance with extant Transport Laws
              and Regulations of Anambra State, and may be reviewed or withdrawn
              for non-compliance.
            </p>
          </div>

          {/* Signature */}
          <div className="mt-auto flex justify-end pb-6 pt-10">
            <div className="flex w-[52%] flex-col items-center">
              {signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature}
                  alt="Commissioner's signature"
                  className="h-[54px] object-contain"
                />
              ) : (
                <div className="h-[54px]" />
              )}
              <span
                className="w-full border-t pt-1 text-center text-[12px] font-bold uppercase leading-tight"
                style={{ borderColor: GREEN, color: GREEN }}>
                Commissioner for Transport
                <br />
                Anambra State
              </span>
            </div>
          </div>
        </div>
        <LetterheadFooter />
      </div>
    </>
  );
}
