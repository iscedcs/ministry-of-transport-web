import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteStaffButton } from "@/components/park-staff/delete-staff-button";
import Image from "next/image";

export default async function ParkStaffListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const park = await db.motorPark.findUnique({
    where: { id },
    include: { parkStaff: { orderBy: { parkSerialNumber: 'asc' } } }
  });

  if (!park || park.applicationStatus !== "APPROVED") notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Staff Directory</h1>
          <p className="text-muted-foreground">{park.businessName}</p>
        </div>
        <Button asChild>
          <Link href={`/motor-parks/${id}/staff/new`}>Onboard New Staff</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {park.parkStaff.map(staff => (
          <div key={staff.id} className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow flex flex-col gap-4 relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex gap-4 items-center overflow-hidden">
                <div className="shrink-0 relative">
                  {staff.photoUrl ? (
                    <Image width={56} height={56} src={staff.photoUrl} alt={staff.name} className="w-14 h-14 rounded-full object-cover shadow-sm ring-1 ring-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted shadow-sm ring-1 ring-border" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold leading-tight truncate" title={staff.name}>{staff.name}</p>
                  <p className="text-sm text-muted-foreground leading-tight mt-1 truncate" title={staff.role}>{staff.role}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/30 rounded-lg p-2.5 flex justify-between items-center border border-border/50">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Security Code</span>
                <span className="text-xs font-mono font-medium">{staff.securityCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2">
              <Button asChild variant="outline" size="sm" className="flex-1 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">
                <Link href={`/motor-parks/${id}/staff/${staff.id}/id-card`}>View ID Card</Link>
              </Button>
              <DeleteStaffButton staffId={staff.id} parkId={id} />
            </div>
          </div>
        ))}
        {park.parkStaff.length === 0 && (
          <p className="text-muted-foreground col-span-3 py-8 text-center">No staff members onboarded yet.</p>
        )}
      </div>
    </div>
  );
}
