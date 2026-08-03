import { getTracasDriverData } from "@/app/actions/tracas";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import Image from "next/image";
import { format } from "date-fns";

export default async function TracasDriverIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await getTracasDriverData(id);
  if (!res.success || !res.driver) notFound();

  const driver = res.driver;
  const securityCode = driver.securityCode || "0000";

  const publicVerificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://mot.anambra.gov.ng"}/verify/tracas-driver/${driver.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    publicVerificationUrl
  )}`;

  const now = new Date();
  const issueDateStr = driver.createdAt
    ? format(new Date(driver.createdAt), "dd MMM yyyy")
    : format(now, "dd MMM yyyy");
  
  const expiryDateStr = driver.licenseExpiryDate
    ? format(new Date(driver.licenseExpiryDate), "dd MMM yyyy")
    : `31 Jan ${now.getFullYear() + 1}`;

  const qrTimestamp = format(now, "dd/MM/yyyy HH:mm");

  return (
    <div className="max-w-2xl mx-auto space-y-8 print:m-0 print:space-y-0 print:w-full py-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Driver Official ID Card</h1>
          <p className="text-sm text-muted-foreground">{driver.fullName}</p>
        </div>
        <PrintButton />
      </div>

      <div
        className="w-[320px] h-[490px] border-2 border-primary rounded-2xl overflow-hidden shadow-xl mx-auto bg-white text-black print:shadow-none flex flex-col relative"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {/* Header Banner */}
        <div className="bg-primary text-primary-foreground p-3 text-center relative">
          <h2 className="font-bold uppercase text-xs leading-tight tracking-wide">
            Ministry of Transport
          </h2>
          <p className="text-[10px] uppercase opacity-90 font-medium">Anambra State · TRACAS</p>
          <span className="absolute top-2.5 right-3 bg-emerald-500 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-xs">
            Active
          </span>
        </div>

        {/* Card Body */}
        <div className="flex-1 flex flex-col items-center pt-3.5 px-4 pb-3">
          {/* Driver Photo */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-primary mb-2 shadow-sm flex items-center justify-center flex-shrink-0">
            {driver.photoUrl ? (
              <Image
                width={80}
                height={80}
                quality={100}
                priority
                src={driver.photoUrl}
                className="w-full h-full object-cover"
                alt={driver.fullName}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                {driver.fullName[0]}
              </div>
            )}
          </div>

          {/* Full Name */}
          <h3 className="font-bold text-base uppercase text-center leading-tight line-clamp-1 text-slate-900">
            {driver.fullName}
          </h3>
          
          {/* Commercial Role & Union */}
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider text-center mt-0.5">
            Commercial Driver
          </p>
          <p className="text-[9px] text-gray-600 font-semibold text-center mt-0.5 truncate max-w-[260px]">
            {driver.operatorAssociation || "TRACAS Transport Union"}
          </p>

          {/* Details Table Card */}
          <div className="w-full bg-gray-50 p-2.5 rounded-xl mt-2 space-y-1.5 text-left border border-gray-200 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold uppercase">Driver ID / Code:</span>
              <span className="font-mono font-bold text-primary">{securityCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold uppercase">License Number:</span>
              <span className="font-mono font-semibold text-slate-900">{driver.licenseNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-200 text-[9px]">
              <span className="text-gray-600 font-semibold">Issue: {issueDateStr}</span>
              <span className="text-gray-600 font-semibold">Expiry: {expiryDateStr}</span>
            </div>
          </div>

          {/* QR Verification & Timestamp Footer */}
          <div className="mt-auto pt-2 flex gap-2 w-full items-end justify-between px-0.5">
            <div className="text-left flex-1 min-w-0 pr-1">
              <p className="text-[9px] font-bold text-emerald-700 uppercase leading-tight">
                ✓ Verified by Anambra State Ministry of Transport
              </p>
              <p className="text-[8px] text-gray-400 font-mono mt-0.5">
                Timestamp: {qrTimestamp}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImageUrl} className="w-14 h-14 rounded border border-gray-300 flex-shrink-0" alt="Verification QR" />
          </div>
        </div>
      </div>
    </div>
  );
}
