import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";

export default async function StaffIdCardPage({ params }: { params: Promise<{ id: string, staffId: string }> }) {
  const { id, staffId } = await params;
  
  const staff = await db.parkStaff.findUnique({
    where: { id: staffId },
    include: { motorPark: true }
  });

  if (!staff || staff.motorParkId !== id) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-8 print:m-0 print:space-y-0 print:w-full">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold">Staff ID Card</h1>
        <PrintButton />
      </div>

      <div 
        className="w-[300px] h-[450px] border-2 border-primary rounded-xl overflow-hidden shadow-lg mx-auto bg-white text-black print:shadow-none flex flex-col relative"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="bg-primary text-primary-foreground p-4 text-center">
          <h2 className="font-bold uppercase leading-tight">Ministry of Transport</h2>
          <p className="text-xs uppercase opacity-90">Anambra State</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center pt-6 px-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 border-2 border-primary mb-4">
            {staff.photoUrl && <img src={staff.photoUrl} className="w-full h-full object-cover" alt="Profile" />}
          </div>
          
          <h3 className="font-bold text-xl uppercase text-center">{staff.name}</h3>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider text-center mt-1">{staff.role}</p>
          
          <div className="w-full bg-gray-100 p-2 rounded mt-4 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Motor Park</p>
            <p className="font-semibold text-sm line-clamp-1">{staff.motorPark.businessName}</p>
          </div>
          
          <div className="mt-auto mb-4 flex gap-4 w-full items-end justify-between px-2">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Security Code</p>
              <p className="font-mono text-sm font-bold">{staff.securityCode}</p>
            </div>
            {staff.qrCodeUrl && (
              <img src={staff.qrCodeUrl} className="w-16 h-16" alt="Verification QR" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
