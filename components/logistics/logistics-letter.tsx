"use client";

import { PrintButton } from "@/components/ui/print-button";
import {
  LetterheadFrame,
  LetterheadHeader,
  LetterheadFooter,
  letterheadPrintCss,
} from "@/components/ui/ministry-letterhead";
import { inWords } from "@/lib/amount-words";

/**
 * LOGISTICS DECLARATION LETTER.
 *
 * DRAFT WORDING — the Ministry said the final text would follow; this is
 * built from what was described on the call (declaration of logistics use,
 * monthly fee, Anambra-colour exemption) so the module works end to end
 * while we wait. Swap the body paragraphs once the real text arrives; the
 * data shape (company vs individual, fee, vehicle) should not need to change.
 *
 * One letter covers the whole company and is reproduced for each of its
 * vehicles, naming that vehicle's own plate number. An individual's letter
 * speaks only of their one vehicle.
 */

export interface LogisticsLetterData {
  id: string;
  permitNumber: string | null;
  applicantType: "COMPANY" | "INDIVIDUAL";
  companyName: string | null;
  contactPerson: string;
  address: string | null;
  monthlyFeeAmount: number | null;
  issuedAt: Date | string | null;
  /** The vehicle this copy of the letter names. */
  vehicle: {
    plateNumber: string;
    vehicleType: string;
  };
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

export function LogisticsLetter({
  data,
  signature,
  showActions = true,
}: {
  data: LogisticsLetterData;
  signature?: string;
  showActions?: boolean;
}) {
  const issued = !!data.permitNumber;
  const isCompany = data.applicantType === "COMPANY";
  const levy = naira(data.monthlyFeeAmount);
  const feeWords =
    data.monthlyFeeAmount != null
      ? `${inWords(data.monthlyFeeAmount / 100)} Naira only`
      : null;

  return (
    <>
      {showActions && (
        <div className="mb-4 flex w-full max-w-[210mm] justify-end print:hidden">
          <PrintButton />
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: letterheadPrintCss("logistics-letter-sheet"),
        }}
      />

      <div
        id="logistics-letter-sheet"
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

          {/* Addressee */}
          <div className="mt-6 space-y-0.5 text-[13px] font-semibold">
            {isCompany ? (
              <>
                <p>The Managing Director,</p>
                <p className="uppercase">{data.companyName}</p>
              </>
            ) : (
              <p className="uppercase">{data.contactPerson}</p>
            )}
            {data.address && <p className="font-normal">{data.address}</p>}
          </div>

          <h3 className="mt-5 text-center text-sm font-bold uppercase underline decoration-2 underline-offset-4 sm:text-base">
            Declaration of Logistics Vehicle
          </h3>

          <div className="mt-3 space-y-3 text-justify text-sm leading-relaxed sm:text-[15px]">
            {isCompany ? (
              <p>
                This is to certify that the vehicle with registration number{" "}
                <span className="font-semibold">{data.vehicle.plateNumber}</span> (
                {data.vehicle.vehicleType}) has been declared to be used for logistics
                services within Anambra State under{" "}
                <span className="font-semibold uppercase">{data.companyName}</span>.
              </p>
            ) : (
              <p>
                This is to certify that the vehicle with registration number{" "}
                <span className="font-semibold">{data.vehicle.plateNumber}</span> (
                {data.vehicle.vehicleType}), registered to{" "}
                <span className="font-semibold">{data.contactPerson}</span>, is strictly
                for logistics services. Please accord it every necessary respect.
              </p>
            )}

            <p>
              By this registration, it is confirmed that this vehicle is exempted from
              painting in Anambra State colours.
            </p>

            <p>
              This vehicle is expected to pay a monthly fee of{" "}
              <span className="font-semibold">{levy ?? <Blank width="7rem" />}</span>{" "}
              {feeWords ? (
                <span className="font-semibold">({feeWords})</span>
              ) : (
                <>
                  (<Blank width="9rem" /> naira only)
                </>
              )}
              .
            </p>

            <p>
              This declaration is subject to compliance with extant Transport Laws and
              Regulations of Anambra State, and may be reviewed or withdrawn for
              non-compliance.
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
