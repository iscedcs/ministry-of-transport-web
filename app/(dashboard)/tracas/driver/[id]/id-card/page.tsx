import { getTracasDriverData } from "@/app/actions/tracas";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import Image from "next/image";

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
        className="w-[300px] h-[450px] border-2 border-primary rounded-xl overflow-hidden shadow-lg mx-auto bg-white text-black print:shadow-none flex flex-col relative"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="bg-primary text-primary-foreground p-3.5 text-center">
          <h2 className="font-bold uppercase text-sm leading-tight tracking-wide">
            Ministry of Transport
          </h2>
          <p className="text-[11px] uppercase opacity-90 font-medium">Anambra State · TRACAS</p>
        </div>

        <div className="flex-1 flex flex-col items-center pt-5 px-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border-2 border-primary mb-3 shadow-sm flex items-center justify-center">
            {driver.photoUrl ? (
              <Image
                width={96}
                height={96}
                quality={100}
                priority
                src={driver.photoUrl}
                className="w-full h-full object-cover"
                alt={driver.fullName}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                {driver.fullName[0]}
              </div>
            )}
          </div>

          <h3 className="font-bold text-lg uppercase text-center leading-tight line-clamp-1">
            {driver.fullName}
          </h3>
          <p className="text-[11px] text-primary font-bold uppercase tracking-wider text-center mt-0.5">
            Commercial Driver
          </p>

          <div className="w-full bg-gray-100 p-2 rounded-lg mt-3 text-center border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase">License Number</p>
            <p className="font-semibold text-xs font-mono">{driver.licenseNumber || "N/A"}</p>
          </div>

          <div className="mt-auto mb-3 flex gap-3 w-full items-end justify-between px-1">
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Security Code</p>
              <p className="font-mono text-base font-bold text-primary">{securityCode}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImageUrl} className="w-16 h-16 rounded border border-gray-300" alt="Verification QR" />
          </div>
        </div>
      </div>
    </div>
  );
}
