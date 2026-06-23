import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default async function VerifyParkStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const staff = await db.parkStaff.findUnique({
    where: { id },
    include: { motorPark: true }
  });

  if (!staff) notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
        {/* Watermark */}
        <div className="absolute inset-0 top-32 flex items-center justify-center pointer-events-none z-0">
          <Image src="/anambra_mot_logo.png" alt="" width={300} height={300} className="opacity-[0.03] object-contain" />
        </div>

        <div className="bg-green-600 pt-8 pb-20 px-6 text-center text-white relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold">Verified Staff Profile</h1>
          <p className="text-sm text-green-100">Ministry of Transport, Anambra State</p>
        </div>

        <div className="px-6 pb-6 pt-0 flex flex-col items-center">
          <div className="-mt-16 z-10">
            {staff.photoUrl ? (
              <Image width={128} height={128} src={staff.photoUrl} alt={staff.name} className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
            ) : (
               <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600">
                 {staff.name[0]}
               </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mt-4 text-center">{staff.name}</h2>
          <Badge className="mt-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">{staff.role}</Badge>

          <div className="w-full space-y-4 mt-8">
            <div className="flex justify-between py-3 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Status</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                {staff.status}
              </Badge>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Motor Park</span>
              <span className="font-medium text-right max-w-[60%]">{staff.motorPark.businessName}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Security Code</span>
              <span className="font-mono font-medium">{staff.securityCode}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-slate-500 text-sm">Serial No.</span>
              <span className="font-mono font-medium">{staff.parkSerialNumber.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
