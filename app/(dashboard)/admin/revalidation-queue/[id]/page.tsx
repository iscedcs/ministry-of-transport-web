import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusPill } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowActions } from "./workflow-actions";

export default async function RevalidationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

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

  const app = await db.revalidationApplication.findUnique({
    where: { id },
    include: {
      applicant: true,
      inspectionOfficer: true,
    },
  });

  if (!app) notFound();

  // Get available inspectors for HOD to assign
  const inspectors = await db.user.findMany({
    where: {
      role: {
        in: ["FIELD_INSPECTOR", "VEHICLE_INSPECTION_OFFICER"],
      },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{app.parkName} Revalidation</h1>
          <p className="text-sm text-muted-foreground mt-1">Application ID: {app.id}</p>
        </div>
        <StatusPill status={app.status as any} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Owner Name</span>
                <p className="font-medium">{app.ownerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Ownership Type</span>
                <p className="font-medium">{app.ownershipType}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">CAC Reg Number</span>
                <p className="font-medium">{app.cacRegistrationNumber || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Representative Name</span>
                <p className="font-medium">{app.representativeName}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Contact Phone</span>
                <p className="font-medium">{app.phoneNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Email</span>
                <p className="font-medium">{app.emailAddress}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">ASIN</span>
                <p className="font-medium">{app.asinNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">TIN</span>
                <p className="font-medium">{app.tin || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facility & Operations</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Facility Type</span>
                <p className="font-medium">{app.facilityType}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block mb-1">Operations</span>
                <p className="font-medium">{(app.facilitySubTypes as string[])?.join(", ") || "None specified"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block mb-1">Location</span>
                <p className="font-medium">{app.physicalLocation}, {app.townCommunity}, {app.lga}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Year Established</span>
                <p className="font-medium">{app.yearEstablished}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Status</span>
                <p className="font-medium">{app.operationalStatus}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Daily Vehicles</span>
                <p className="font-medium">{app.dailyVehiclesCount}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block mb-1">Vehicle Types</span>
                <p className="font-medium">{(JSON.parse(app.vehicleTypes) as string[])?.join(", ") || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection & Official Use</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Inspection Officer</span>
                <p className="font-medium">{app.inspectionOfficer ? `${app.inspectionOfficer.firstName} ${app.inspectionOfficer.lastName}` : "Not Assigned"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Inspection Date</span>
                <p className="font-medium">{app.inspectionDate ? app.inspectionDate.toLocaleDateString() : "Not Scheduled"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block mb-1">Findings</span>
                <p className="font-medium whitespace-pre-wrap">{app.findings || "No findings recorded yet."}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Inspector Recommendation</span>
                <p className="font-medium">{app.recommendation || "Pending"}</p>
              </div>
              
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <h4 className="font-semibold mb-3">Signatures & Approvals</h4>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">HOD Revalidation</span>
                <p className="font-medium">{app.hodApprovedAt ? `Signed on ${app.hodApprovedAt.toLocaleDateString()}` : "Pending"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Commissioner</span>
                <p className="font-medium">{app.commissionerApprovedAt ? `Signed on ${app.commissionerApprovedAt.toLocaleDateString()}` : "Pending"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Permanent Secretary</span>
                <p className="font-medium">{app.psApprovedAt ? `Signed on ${app.psApprovedAt.toLocaleDateString()}` : "Pending"}</p>
              </div>
              {app.revalidationNumber && (
                <div className="sm:col-span-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg mt-4">
                  <span className="text-green-800 dark:text-green-300 block mb-1 text-xs uppercase tracking-wider font-semibold">Approval Number</span>
                  <p className="font-bold text-lg text-green-900 dark:text-green-100">{app.revalidationNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <WorkflowActions 
            applicationId={app.id}
            status={app.status}
            role={session.role}
            inspectors={inspectors}
            assignedInspectorId={app.inspectionOfficerId}
          />
        </div>
      </div>
    </div>
  );
}
