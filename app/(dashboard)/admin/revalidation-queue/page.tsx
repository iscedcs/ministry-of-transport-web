import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import Link from "next/link";
import { CheckSquare, Building2 } from "lucide-react";

function getClaimedFacilitiesCount(facilitiesJson: any): number {
  if (!facilitiesJson) return 0;
  try {
    const obj = typeof facilitiesJson === "string" ? JSON.parse(facilitiesJson) : facilitiesJson;
    return Object.entries(obj || {}).filter(([_, v]) => Boolean(v)).length;
  } catch {
    return 0;
  }
}

export default async function RevalidationQueuePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only allow relevant roles to view the queue
  const allowedRoles = [
    "HOD_PARKS_REVALIDATION", 
    "HOD_PARKS", 
    "COMMISSIONER", 
    "PERMANENT_SECRETARY", 
    "SYSTEM_ADMIN",
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER"
  ];
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  // If user is an inspector, only show applications assigned to them
  const isInspector = session.role === "FIELD_INSPECTOR" || session.role === "VEHICLE_INSPECTION_OFFICER";
  
  const applications = await db.revalidationApplication.findMany({
    where: isInspector ? { inspectionOfficerId: session.userId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { applicant: true },
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Revalidation Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review, compare, and process park and facility revalidation applications.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center bg-muted/60 px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground">
          <span>Total Submissions: <strong className="text-foreground">{applications.length}</strong></span>
        </div>
      </div>

      <div className="grid gap-4">
        {applications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
            <CardTitle className="text-lg mb-2">No Applications</CardTitle>
            <CardDescription>There are currently no revalidation applications in the queue.</CardDescription>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-xs bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/80 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">Date</th>
                    <th className="py-3.5 px-4">Applicant / Owner</th>
                    <th className="py-3.5 px-4">Park Name</th>
                    <th className="py-3.5 px-4">Facility Type</th>
                    <th className="py-3.5 px-4 text-center">Facilities Claimed</th>
                    <th className="py-3.5 px-4">LGA</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {applications.map((app) => {
                    const claimedCount = getClaimedFacilitiesCount(app.facilitiesAvailable);
                    return (
                      <tr key={app.id} className="hover:bg-muted/40 transition-colors group">
                        <td className="py-4 pl-6 pr-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {app.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-4 px-4 font-semibold text-foreground">
                          {app.ownerName}
                          <span className="block text-xs font-normal text-muted-foreground mt-0.5">{app.phoneNumber}</span>
                        </td>
                        <td className="py-4 px-4 font-medium text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" /> {app.parkName}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border">
                            {app.facilityType}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <CheckSquare className="w-3.5 h-3.5" /> {claimedCount} Available
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground font-medium">{app.lga}</td>
                        <td className="py-4 px-4 whitespace-nowrap"><StatusPill status={app.status as any} /></td>
                        <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                          <Link 
                            href={`/admin/revalidation-queue/${app.id}`} 
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-xs transition-all shadow-2xs"
                          >
                            Compare & Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
