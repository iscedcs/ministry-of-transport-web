import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { ReviewActions } from "./review-actions";
import { PhotoControl } from "./photo-control";
import { enforcementTypeLabel } from "@/lib/enforcement-type";
import {
  isEnforcementApprover,
  isEnforcementViewer,
} from "@/lib/enforcement-roles";

export const metadata = {
  title: "Application Details | Special Enforcement Unit",
};

export default async function ParkMonitorAppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const session = await getSession();
  if (!session) redirect("/auth/login");

  if (!isEnforcementViewer(session.role)) {
    redirect("/dashboard");
  }
  // HODs, System Admin and Commissioner approve; the PS and Admin view only.
  const isApprover = isEnforcementApprover(session.role);

  const app = await db.parkMonitorApplication.findUnique({
    where: { id: resolvedParams.id },
    include: {
      user: true,
      group: { select: { id: true, name: true, unit: true, area: true } },
    },
  });

  if (!app) notFound();

  const canReview =
    isApprover &&
    (app.status === "SUBMITTED" ||
      app.status === "UNDER_REVIEW" ||
      app.status === "WAITLISTED");
  // Approved under the old flow (fee/claim step) and never issued a card.
  const canIssueLegacyId =
    isApprover && app.status === "APPROVED" && !app.idCardIssued;
  // Approving prints the card, so a photograph must be on file first.
  const canEditPhoto =
    isApprover && app.status !== "REJECTED" && !app.idCardIssued;

  // Type assertion since Prisma Json is loosely typed
  const referees = (app.referees as any[]) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Application: {app.firstName} {app.surname}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted on {format(new Date(app.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        <StatusPill status={app.status as any} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biodata</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block text-xs">Full Name</span>{app.firstName} {app.otherNames} {app.surname}</div>
              <div><span className="text-muted-foreground block text-xs">Gender / Age</span>{app.gender} / {app.age}</div>
              <div><span className="text-muted-foreground block text-xs">NIN</span>{app.nin}</div>
              <div><span className="text-muted-foreground block text-xs">Marital Status</span>{app.maritalStatus}</div>
              <div><span className="text-muted-foreground block text-xs">Origin</span>{app.lga}, {app.stateOfOrigin} State</div>
              <div><span className="text-muted-foreground block text-xs">Community/Town</span>{app.communityTown}</div>
              <div className="col-span-2"><span className="text-muted-foreground block text-xs">Residential Address</span>{app.residentialAddress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block text-xs">Phone Number</span>{app.phoneNumber}</div>
              <div><span className="text-muted-foreground block text-xs">Email Address</span>{app.emailAddress || "Not provided"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment & Health</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block text-xs">Current Occupation</span>{app.currentOccupation || "None"}</div>
              <div><span className="text-muted-foreground block text-xs">Employer</span>{app.employer || "None"}</div>
              <div><span className="text-muted-foreground block text-xs">Position Held</span>{app.positionHeld || "None"}</div>
              <div><span className="text-muted-foreground block text-xs">Enforcement Type</span>{enforcementTypeLabel(app.enforcementType)}</div>
              <div><span className="text-muted-foreground block text-xs">Medically Fit?</span>{app.isMedicallyFit ? "Yes" : "No"}</div>
              <div><span className="text-muted-foreground block text-xs">Height</span>{app.height || "-"}</div>
              <div><span className="text-muted-foreground block text-xs">Weight</span>{app.weight || "-"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Character & Security</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block text-xs">Criminal Conviction?</span>{app.hasCriminalConviction ? "Yes" : "No"}</div>
              <div><span className="text-muted-foreground block text-xs">Agrees to Background Check?</span>{app.agreesToSecurityCheck ? "Yes" : "No"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referees & Next of Kin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div>
                <span className="font-medium">Next of Kin</span>
                <div className="grid grid-cols-2 gap-2 mt-2 bg-secondary/30 p-3 rounded-md">
                  <div><span className="text-muted-foreground text-xs block">Name</span>{app.nextOfKinName}</div>
                  <div><span className="text-muted-foreground text-xs block">Phone</span>{app.nextOfKinPhone}</div>
                  <div><span className="text-muted-foreground text-xs block">Relationship</span>{app.nextOfKinRelationship}</div>
                  <div><span className="text-muted-foreground text-xs block">Address</span>{app.nextOfKinAddress}</div>
                </div>
              </div>
              
              <div>
                <span className="font-medium">Referees</span>
                <div className="mt-2 space-y-2">
                  {referees.length === 0 && (
                    <p className="text-xs text-muted-foreground">No referees provided.</p>
                  )}
                  {referees.map((r: any, i: number) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-secondary/30 p-2 rounded-md text-xs">
                      <div><span className="text-muted-foreground block">Name</span>{r.name}</div>
                      <div><span className="text-muted-foreground block">Phone</span>{r.phone}</div>
                      <div><span className="text-muted-foreground block">Email</span>{r.email || "-"}</div>
                      <div><span className="text-muted-foreground block">Relation</span>{r.relation || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {(canReview || canIssueLegacyId) && (
            <ReviewActions
              applicationId={app.id}
              canReview={canReview}
              canIssueId={canIssueLegacyId}
              hasPhoto={!!app.idCardPhotoUrl}
            />
          )}

          {app.status !== "REJECTED" && (
            <Card>
              <CardHeader>
                <CardTitle>Passport Photograph</CardTitle>
                <CardDescription>Printed on the ID card.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                {canEditPhoto ? (
                  <PhotoControl
                    applicationId={app.id}
                    initialUrl={app.idCardPhotoUrl}
                  />
                ) : app.idCardPhotoUrl ? (
                  <div className="relative h-32 w-28 overflow-hidden rounded-lg border">
                    <Image src={app.idCardPhotoUrl} alt="Applicant Photo" fill className="object-cover" />
                  </div>
                ) : (
                  <span className="text-amber-600 font-medium">No photograph yet</span>
                )}
              </CardContent>
            </Card>
          )}

          {app.status === "APPROVED" && (
            <Card>
              <CardHeader>
                <CardTitle>ID Card</CardTitle>
                <CardDescription>
                  Generated automatically when an application is approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app.idCardIssued ? (
                  <div>
                    <span className="text-green-600 font-medium flex items-center">
                      <span className="mr-2">✓</span> ID Card Issued
                    </span>
                    <Link href={`/admin/park-monitors/${app.id}/id-card`} className="text-primary hover:underline block mt-2 text-xs">
                      Open ID card for printing
                    </Link>
                    {app.qrCodeUrl && (
                      <a href={app.qrCodeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block mt-2 text-xs">
                        View QR Code
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-amber-600 font-medium">Not issued yet</span>
                )}
              </CardContent>
            </Card>
          )}

          {app.status === "APPROVED" && (
            <Card>
              <CardHeader>
                <CardTitle>Unit &amp; Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Unit</span>
                  {enforcementTypeLabel(app.enforcementType)}
                </div>
                {app.group ? (
                  <div>
                    <span className="text-muted-foreground block text-xs">Group</span>
                    <Link href={`/admin/park-monitors/groups/${app.group.id}`} className="text-primary hover:underline">
                      {app.group.name}
                    </Link>
                    <span className="text-muted-foreground"> · {app.group.area}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Not in a group yet. An HOD can add them when forming a unit.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {app.status === "REJECTED" && app.rejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700">{app.rejectionReason}</p>
              </CardContent>
            </Card>
          )}

          {app.status === "WAITLISTED" && app.waitlistReason && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-800">Waitlist Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700">{app.waitlistReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
