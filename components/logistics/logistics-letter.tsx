"use client";

import { PrintButton } from "@/components/ui/print-button";
import {
  LetterheadFrame,
  LetterheadHeader,
  LetterheadFooter,
  letterheadPrintCss,
} from "@/components/ui/ministry-letterhead";

/**
 * LOGISTICS REGISTRATION LETTER.
 *
 * The approved Ministry wording: an approval of registration for
 * logistics/delivery, the black-and-yellow (amber) colour exemption, the
 * documents the waiver does NOT cover, and the monthly operational fee
 * payable through Paydirect against the operator's ASIN.
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
            Approval of Registration of {data.vehicle.vehicleType} with{" "}
            {data.vehicle.plateNumber} for Logistics/Delivery
          </h3>

          <div className="mt-3 space-y-3 text-justify text-sm leading-relaxed sm:text-[15px]">
            <p>
              The Ministry in pursuant to its statutory mandate has approved the
              subject vehicle for logistics/delivery services in the State.
            </p>

            <p>
              2. In view of the foregoing, the vehicle is exempted from painting
              approved commercial colours of black and yellow (amber) for
              intra-state vehicles.
            </p>

            <p>
              3. However, the above exemption (waiver) does not apply to vehicle
              license, roadworthiness certificate, hackney/stage carriage permit
              and insurance (minimum of third party motor vehicle insurance)
              certificate which are mandatory for every vehicle plying the public
              roads to possess under extant National and State Laws and
              Regulations.
            </p>

            <p>
              4. You are to note that the exemption from approved commercial
              colours apply ONLY to your duly branded and recognized/registered
              vehicles which must be registered with and approved by the Ministry.
            </p>

            <p>
              5. You are to pay a monthly operational fee of{" "}
              <span className="font-semibold">{levy ?? <Blank width="7rem" />}</span>{" "}
              into Paydirect using {isCompany ? "your company's" : "your"} ASIN.
            </p>

            <p>
              6. The Ministry expects your strict adherence to the terms of this
              approval granted you for it to continue to subsist.
            </p>

            <p>Congratulations and please accept my warm regards.</p>
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
                Hon. Edward Obiefuna Ibuzo
                <br />
                Honourable Commissioner
              </span>
            </div>
          </div>
        </div>
        <LetterheadFooter />
      </div>
    </>
  );
}
