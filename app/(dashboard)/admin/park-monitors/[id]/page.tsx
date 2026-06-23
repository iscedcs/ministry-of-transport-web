import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { format } from "date-fns";
import Image from "next/image";
import { ReviewActions } from "./review-actions";

export const metadata = {
  title: "Application Details | Park Monitors",
};

export default async function ParkMonitorAppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const isExecutive = session.role === "COMMISSIONER" || session.role === "PERMANENT_SECRETARY";
  const isHod = session.role === "HOD_PARKS" || session.role === "SYSTEM_ADMIN";

  if (!isExecutive && !isHod) {
    redirect("/dashboard");
  }

  const app = await db.parkMonitorApplication.findUnique({
    where: { id: resolvedParams.id },
    include: {
      user: true,
    }
  });

  if (!app) notFound();

  let payment = null;
  if (app.idCardPaymentId) {
    payment = await db.payment.findUnique({ where: { id: app.idCardPaymentId } });
  }

  const isPaymentCompleted = payment?.status === "COMPLETED";
  const canReview = isExecutive && (app.status === "SUBMITTED" || app.status === "UNDER_REVIEW" || app.status === "WAITLISTED");
  const canIssueId = isHod && app.status === "APPROVED" && isPaymentCompleted && !app.idCardIssued;

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
              <div><span className="text-muted-foreground block text-xs">Email Address</span>{app.emailAddress}</div>
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
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Reason for Joining Unit</span>
                <p className="mt-1 bg-secondary/50 p-3 rounded-md text-slate-700">{app.reasonForJoining}</p>
              </div>
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
          {(canReview || canIssueId) && (
            <ReviewActions 
              applicationId={app.id} 
              canReview={canReview} 
              canIssueId={canIssueId} 
              isExecutive={isExecutive}
            />
          )}

          {app.status === "APPROVED" && (
            <Card>
              <CardHeader>
                <CardTitle>ID Card Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Passport Photo</span>
                  {app.idCardPhotoUrl ? (
                    <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border">
                      <Image src={app.idCardPhotoUrl} alt="Applicant Photo" fill className="object-cover" />
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium mt-1 inline-block">Pending Upload</span>
                  )}
                </div>
                
                <div>
                  <span className="text-muted-foreground block text-xs">ID Fee Payment (₦20,000)</span>
                  {isPaymentCompleted ? (
                    <span className="text-green-600 font-medium inline-block mt-1">Completed</span>
                  ) : (
                    <span className="text-amber-600 font-medium inline-block mt-1">Pending</span>
                  )}
                </div>

                {app.idCardIssued && (
                  <div className="pt-4 border-t">
                    <span className="text-green-600 font-medium flex items-center">
                      <span className="mr-2">✓</span> ID Card Issued
                    </span>
                    <a href={app.qrCodeUrl!} target="_blank" rel="noreferrer" className="text-primary hover:underline block mt-2 text-xs">
                      View QR Code
                    </a>
                  </div>
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
