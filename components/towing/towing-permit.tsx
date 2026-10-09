"use client";

import { PrintButton } from "@/components/ui/print-button";
import {
  LetterheadFrame,
  LetterheadHeader,
  LetterheadFooter,
  letterheadPrintCss,
} from "@/components/ui/ministry-letterhead";

/**
 * ANAMBRA STATE TOWING PERMIT.
 *
 * Towing vans register, then the Commissioner issues this permit — there is
 * no separate letter and certificate the way mass transit and motor parks
 * have one each. This single document carries the decision.
 */

export interface TowingPermitData {
  id: string;
  permitNumber: string | null;
  plateNumber: string;
  vehicleType: string;
  make: string | null;
  model: string | null;
  color: string | null;
  operatorName: string;
  operatorPhone: string;
  hasAssistant: boolean;
  assistantName: string | null;
  lgaName: string | null;
  issuedAt: Date | string | null;
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

function Blank({ width = "8rem" }: { width?: string }) {
  return (
    <span
      className="inline-block border-b border-dotted border-slate-500 align-baseline"
      style={{ width }}
    />
  );
}

export function TowingPermit({
  data,
  signature,
  showActions = true,
}: {
  data: TowingPermitData;
  signature?: string;
  showActions?: boolean;
}) {
  const issued = !!data.permitNumber;

  return (
    <>
      {showActions && (
        <div className="mb-4 flex w-full max-w-[210mm] justify-end print:hidden">
          <PrintButton />
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: letterheadPrintCss("towing-permit-sheet"),
        }}
      />

      <div
        id="towing-permit-sheet"
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
          <LetterheadHeader ourRef={data.permitNumber} date={data.issuedAt} />

          <h3 className="mt-5 text-center text-sm font-bold uppercase underline decoration-2 underline-offset-4 sm:text-base">
            Anambra State Towing Permit
          </h3>

          <div className="mt-3 space-y-3 text-justify text-sm leading-relaxed sm:text-[15px]">
            <p>
              This is to certify that the vehicle with registration number{" "}
              <span className="font-semibold">{data.plateNumber}</span> (
              {[data.vehicleType, data.make, data.model, data.color]
                .filter(Boolean)
                .join(", ")}
              ) is registered with the Ministry of Transport, Anambra State,
              strictly for towing services, and is authorised to operate within{" "}
              <span className="font-semibold">
                {data.lgaName ?? <Blank width="10rem" />}
              </span>{" "}
              Local Government Area.
            </p>

            <p>
              Permit Number:{" "}
              <span className="font-mono font-semibold">
                {data.permitNumber ?? <Blank width="10rem" />}
              </span>
            </p>

            <p>
              Operator:{" "}
              <span className="font-semibold">{data.operatorName}</span> (
              {data.operatorPhone})
              {data.hasAssistant && data.assistantName && (
                <>
                  , with assistant{" "}
                  <span className="font-semibold">{data.assistantName}</span>
                </>
              )}
              .
            </p>

            <p>
              Please accord this vehicle and its operator every necessary
              respect in the course of their lawful duties.
            </p>

            <p>
              This permit is subject to compliance with extant Transport Laws
              and Regulations of Anambra State, and may be reviewed or
              withdrawn for non-compliance.
            </p>
          </div>

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
