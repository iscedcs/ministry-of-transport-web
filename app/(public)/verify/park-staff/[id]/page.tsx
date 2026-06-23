import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function VerifyParkStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const staff = await db.parkStaff.findUnique({
    where: { id },
    include: { motorPark: true }
  });

  if (!staff) notFound();

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-green-600 p-6 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold">Verified Staff Profile</h1>
          <p className="text-sm text-green-100">Ministry of Transport, Anambra State</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          {staff.photoUrl ? (
            <img src={staff.photoUrl} alt={staff.name} className="w-32 h-32 rounded-full border-4 border-background -mt-20 shadow-lg object-cover" />
          ) : (
             <div className="w-32 h-32 rounded-full border-4 border-background -mt-20 shadow-lg bg-muted flex items-center justify-center text-3xl font-bold">
               {staff.name[0]}
             </div>
          )}

          <h2 className="text-2xl font-bold mt-4 text-center">{staff.name}</h2>
          <Badge variant="outline" className="mt-2 text-sm">{staff.role}</Badge>

          <div className="w-full space-y-4 mt-8">
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Status</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                {staff.status}
              </Badge>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Motor Park</span>
              <span className="font-medium text-right max-w-[60%]">{staff.motorPark.businessName}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground text-sm">Security Code</span>
              <span className="font-mono font-medium">{staff.securityCode}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground text-sm">Serial No.</span>
              <span className="font-mono font-medium">{staff.parkSerialNumber.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
