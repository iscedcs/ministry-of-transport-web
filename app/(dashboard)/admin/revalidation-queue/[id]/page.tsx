import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusPill } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
  SECTION_TITLES,
  parseChecklist,
} from "@/lib/revalidation-checklist";
import { WorkflowActions } from "./workflow-actions";
import { 
  CheckCircle2,
  HelpCircle, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Users, 
  Banknote, 
  ShieldCheck, 
  ClipboardList,
  Camera, 
  User, 
  CheckSquare, 
  ExternalLink, 
  FileText,
  ArrowLeft,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

function safeParseJson(val: any, fallback: any = {}) {
  if (!val) return fallback;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val;
}

const STANDARD_FACILITIES = [
  "Perimeter Fence", "Security Post", "Toilet Facilities", "Borehole/Water Supply",
  "Passenger Waiting Area", "Loading Bay", "Fire Extinguishers", "CCTV Cameras",
  "Solar/Street Lights", "Ticketing Point", "Manager/Admin Office"
];

function StatusRow({ label, status, isPositive }: { label: string; status: string; isPositive: boolean | null }) {
  const unanswered = isPositive === null;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        unanswered
          ? "bg-muted text-muted-foreground border-border"
          : isPositive
            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
            : "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/20"
      )}>
        {unanswered
          ? <HelpCircle className="w-3.5 h-3.5" />
          : isPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        {status}
      </span>
    </div>
  );
}

export default async function RevalidationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedRoles = [
    "HOD_PARKS_REVALIDATION",
    "HOD_TRANSPORT_OPS",
    "HOD_VIS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
    "ADMIN",
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER",
  ];
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id },
    include: {
      applicant: true,
      inspectionOfficer: true,
      inspectionTeam: {
        orderBy: [{ isLead: "desc" }, { createdAt: "asc" }],
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      },
    },
  });

  if (!app) notFound();

  // Inspection artefacts for the reviewer.
  const checklist = parseChecklist(app.inspectionChecklist);
  const verifiedCount = checklist.filter((c) => c.verified === "YES").length;
  const partialCount = checklist.filter((c) => c.verified === "PARTIAL").length;
  const failedCount = checklist.filter((c) => c.verified === "NO").length;
  const evidence: { url: string; caption?: string }[] = Array.isArray(
    app.evidenceUrls,
  )
    ? (app.evidenceUrls as { url: string; caption?: string }[])
    : [];


  // Get available inspectors for HOD to assign
  const inspectors = await db.user.findMany({
    where: {
      role: {
        in: [
          "FIELD_INSPECTOR",
          "VEHICLE_INSPECTION_OFFICER",
          "HOD_VIS",
          "HOD_TRANSPORT_OPS",
          "HOD_PARKS",
          "HOD_PARKS_REVALIDATION",
          "PARK_MONITOR",
        ],
      },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      stationLocation: true,
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  const canEdit =
    session.role === "HOD_TRANSPORT_OPS" ||
    session.role === "HOD_PARKS_REVALIDATION" ||
    session.role === "SYSTEM_ADMIN";

  const incompleteSections = Array.isArray(app.incompleteSections)
    ? (app.incompleteSections as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];

  const team = app.inspectionTeam.map((m) => ({
    userId: m.userId,
    isLead: m.isLead,
    comment: m.comment,
    commentedAt: m.commentedAt,
    name: `${m.user.firstName} ${m.user.lastName}`,
    role: m.user.role as string,
  }));

  const facilitiesObj = safeParseJson(app.facilitiesAvailable, {});
  const facilitySubTypesList = Array.isArray(safeParseJson(app.facilitySubTypes, [])) 
    ? safeParseJson(app.facilitySubTypes, []) 
    : [];
  const vehicleTypesList = Array.isArray(safeParseJson(app.vehicleTypes, []))
    ? safeParseJson(app.vehicleTypes, [])
    : [];

  const allFacilitiesList = Array.from(new Set([...STANDARD_FACILITIES, ...Object.keys(facilitiesObj)]));
  const claimedCount = Object.entries(facilitiesObj).filter(([_, v]) => Boolean(v)).length;
  const totalStaffCount = (app.managementStaffCount || 0) + (app.adminStaffCount || 0) + (app.securityStaffCount || 0) + (app.otherStaffCount || 0);

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <Link
        href="/admin/revalidation-queue"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Revalidation Queue
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-card border shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display tracking-tight">{app.parkName} Revalidation</h1>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-md border border-primary/20">
              {app.facilityType}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <span>Application ID: <strong className="font-mono text-foreground">{app.id}</strong></span>
            <span>•</span>
            <span>Submitted on {app.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          {canEdit && app.status !== "APPROVED" && (
            <Link
              href={`/admin/revalidation-queue/${app.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
              <FileText className="h-3.5 w-3.5" />
              Edit application
              {incompleteSections.length > 0 && (
                <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  {incompleteSections.length} section
                  {incompleteSections.length === 1 ? "" : "s"} incomplete
                </span>
              )}
            </Link>
          )}
          <StatusPill status={app.status as any} />
          {app.revalidationNumber && (
            <span className="text-xs font-mono font-bold bg-green-500/10 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-md border border-green-500/30">
              {app.revalidationNumber}
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Card 1: Section A & B — Applicant & ASIN Details */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Section A & B: Applicant & State ID Details
              </CardTitle>
              <CardDescription>Verified owner, representative, and official registration particulars.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {app.passportPhotoUrl && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/15 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-primary/20 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={app.passportPhotoUrl} alt="Passport Photograph" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Applicant Passport Photograph</p>
                      <p className="text-xs text-muted-foreground">Uploaded for visual identification and identity verification</p>
                    </div>
                  </div>
                  <a 
                    href={app.passportPhotoUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
                  >
                    View Photo <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Owner / Company Name</span>
                  <p className="font-semibold text-foreground">{app.ownerName}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Ownership Type</span>
                  <p className="font-semibold text-foreground">{app.ownershipType}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">CAC Registration Number</span>
                  <p className="font-semibold font-mono text-foreground">{app.cacRegistrationNumber || "Not Provided"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">ASIN Number</span>
                  <p className="font-semibold font-mono text-primary bg-primary/10 inline-block px-2 py-0.5 rounded">{app.asinNumber}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Representative Name</span>
                  <p className="font-semibold text-foreground">{app.representativeName}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Designation</span>
                  <p className="font-semibold text-foreground">{app.designation || "Not Specified"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Primary Phone Number</span>
                  <p className="font-semibold font-mono text-foreground">{app.phoneNumber}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Alternate Phone Number</span>
                  <p className="font-semibold font-mono text-foreground">{app.alternatePhoneNumber || "None"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Email Address</span>
                  <p className="font-semibold text-foreground">{app.emailAddress}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">National Identity Number (NIN)</span>
                  <p className="font-semibold font-mono text-foreground">{app.nin || "Not Specified"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Tax Identification Number (TIN)</span>
                  <p className="font-semibold font-mono text-foreground">{app.tin || "Not Provided"}</p>
                </div>
                <div className="sm:col-span-2 border-t pt-4 mt-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Residential / Business Address</span>
                  <p className="font-semibold text-foreground leading-relaxed">{app.residentialAddress || "No address recorded."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Section C & D — Park Infrastructure & Operations */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Section C & D: Park Infrastructure & Operations
              </CardTitle>
              <CardDescription>Physical location, operational scale, and operating vehicle breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Facility Type</span>
                <p className="font-semibold text-foreground">{app.facilityType}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Operational Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {app.operationalStatus}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Facility Operations & Services</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {facilitySubTypesList.length > 0 ? (
                    facilitySubTypesList.map((op: string) => (
                      <span key={op} className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium text-xs border">
                        {op}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground font-medium">None specified</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Physical Location & Address</span>
                <p className="font-semibold text-foreground leading-relaxed">{app.physicalLocation}, {app.townCommunity}, {app.lga} LGA</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Year Established</span>
                <p className="font-semibold font-mono text-foreground">{app.yearEstablished}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Daily Vehicles Count</span>
                <p className="font-semibold text-foreground">{app.dailyVehiclesCount} vehicles / day</p>
              </div>
              <div className="sm:col-span-2 border-t pt-4 mt-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Types of Vehicles Operating</span>
                <div className="flex flex-wrap gap-2">
                  {vehicleTypesList.length > 0 ? (
                    vehicleTypesList.map((vt: string) => (
                      <span key={vt} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                        {vt}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground font-medium">No vehicle types recorded</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Section E — Facilities Available (For Verification & Comparison) */}
          <Card className="overflow-hidden border-primary/30 shadow-xs bg-gradient-to-b from-card to-secondary/10">
            <CardHeader className="bg-primary/5 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <CheckSquare className="w-4 h-4 text-primary" /> Section E: Facilities Available (Site Verification)
                </CardTitle>
                <CardDescription className="mt-0.5">Compare these applicant-submitted claims against physical site evaluation.</CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs self-start sm:self-center">
                {claimedCount} Claimed Available
              </span>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Inspector Verification Notice:</strong> Review the facilities claimed by the applicant below during your on-site physical inspection. Any discrepancies between claims and physical reality should be documented in your findings.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allFacilitiesList.map((fac) => {
                  const isAvailable = Boolean(facilitiesObj[fac]);
                  return (
                    <div
                      key={fac}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                        isAvailable
                          ? "bg-green-500/10 border-green-500/30 text-foreground font-semibold shadow-2xs dark:bg-green-950/20"
                          : "bg-muted/40 border-border/50 text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {isAvailable ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={!isAvailable ? "line-through text-xs opacity-75 font-normal" : ""}>{fac}</span>
                      </div>
                      {isAvailable ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-green-700 dark:text-green-300 bg-green-500/20 px-2 py-0.5 rounded">
                          Claimed
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded">
                          Not Available
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Section F — Regulatory Compliance */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Section F: Regulatory Compliance
              </CardTitle>
              <CardDescription>Legal compliance posture, manifests, safety signages, and MOT sanction history.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <span className="text-sm font-medium text-foreground">Existing MOT Approval Number</span>
                <span className="font-mono text-xs font-semibold bg-secondary px-2.5 py-1 rounded border">{app.existingApprovalNum || "None Recorded"}</span>
              </div>
              <StatusRow label="Maintains Daily Passenger Manifest" status={app.maintainsManifest === null ? "Not stated" : app.maintainsManifest ? "Yes (Compliant)" : "No (Non-Compliant)"} isPositive={app.maintainsManifest} />
              <StatusRow label="All Operators & Drivers Registered with MOT" status={app.operatorsRegistered === null ? "Not stated" : app.operatorsRegistered ? "Yes (Compliant)" : "No (Non-Compliant)"} isPositive={app.operatorsRegistered} />
              <StatusRow label="State Revenue Payments Up-to-Date" status={app.paymentsUpToDate === null ? "Not stated" : app.paymentsUpToDate ? "Yes (Compliant)" : "No (Non-Compliant)"} isPositive={app.paymentsUpToDate} />
              <StatusRow label="Visible Safety Signages Installed in Park" status={app.safetySignages === null ? "Not stated" : app.safetySignages ? "Yes (Compliant)" : "No (Non-Compliant)"} isPositive={app.safetySignages} />
              <StatusRow label="Any Pending Sanctions from Ministry of Transport?" status={app.pendingSanctions === null ? "Not stated" : app.pendingSanctions ? "Yes (Flagged Sanction)" : "No (Clean Record)"} isPositive={app.pendingSanctions === null ? null : !app.pendingSanctions} />
              
              {(app.pendingSanctions || app.sanctionDetails) && (
                <div className="mt-2 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <span className="font-semibold text-destructive text-sm block mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Reported Sanction Details
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{app.sanctionDetails || "No detailed explanation provided by applicant."}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 5: Section G — Employment & Security Data */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Section G: Employment & Security Data
              </CardTitle>
              <CardDescription>Personnel headcount distribution and on-site security arrangements.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-3.5 rounded-xl bg-secondary/40 border text-center">
                  <span className="text-2xl font-bold font-mono text-foreground block">{app.managementStaffCount || 0}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1 block">Management</span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border text-center">
                  <span className="text-2xl font-bold font-mono text-foreground block">{app.adminStaffCount || 0}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1 block">Administrative</span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border text-center">
                  <span className="text-2xl font-bold font-mono text-foreground block">{app.securityStaffCount || 0}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1 block">Security Staff</span>
                </div>
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <span className="text-2xl font-bold font-mono text-primary block">{totalStaffCount}</span>
                  <span className="text-xs text-primary font-bold mt-1 block uppercase tracking-wider">Total Staff</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t text-sm">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Other Staff Breakdown</span>
                  <p className="font-semibold text-foreground">
                    {app.otherStaffCount || 0} personnel {app.otherStaffDetails ? `(${app.otherStaffDetails})` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Security Arrangement</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> {app.securityArrangement || "None Specified"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Section H — Revenue Information */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" /> Section H: Revenue Information
              </CardTitle>
              <CardDescription>Applicant estimated financial turnover and revenue collection methodology.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid sm:grid-cols-3 gap-6 text-sm">
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <span className="text-xs font-medium text-green-800 dark:text-green-300 uppercase tracking-wider block mb-1">Estimated Daily Revenue</span>
                <p className="text-lg font-bold font-mono text-green-900 dark:text-green-200">
                  ₦{((app.estimatedDailyRevenue || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <span className="text-xs font-medium text-green-800 dark:text-green-300 uppercase tracking-wider block mb-1">Estimated Monthly Revenue</span>
                <p className="text-lg font-bold font-mono text-green-900 dark:text-green-200">
                  ₦{((app.estimatedMonthlyRev || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/40 border flex flex-col justify-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Collection Methodology</span>
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-primary shrink-0" /> {app.revenueCollectionMethod || "Not Specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 7: Section I — Inspection & Official Use */}
          <Card className="overflow-hidden border-border/60 shadow-xs">
            <CardHeader className="bg-muted/40 border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Section I: Inspection & Official Use
              </CardTitle>
              <CardDescription>Assigned field inspection officer, evaluation findings, and executive sign-offs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
              {/* The team, its lead, and every member's comment. The HOD of
                  Operations and the reviewers above them decide on the basis
                  of all of it, not the lead's checklist alone. */}
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Inspection Team ({team.length})
                </span>
                {team.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team assigned yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {team.map((m) => (
                      <div key={m.userId} className="rounded-lg border bg-secondary/30 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{m.name}</span>
                          {m.isLead && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <Star className="w-3 h-3" /> Lead — filed the checklist
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {m.role.replace(/_/g, " ").toLowerCase().replace(/\w/g, (c) => c.toUpperCase())}
                          </span>
                        </div>
                        {m.isLead ? null : m.comment ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{m.comment}</p>
                        ) : (
                          <p className="mt-2 text-sm italic text-muted-foreground">No comment recorded yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Inspection Scheduled Date</span>
                <p className="font-semibold font-mono text-foreground">
                  {app.inspectionDate ? app.inspectionDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not Scheduled"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Inspector Findings & Remarks</span>
                <div className="p-4 rounded-xl bg-secondary/40 border font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                  {app.findings || "No inspection findings recorded yet."}
                </div>
              </div>
              {app.hodOpsRecommendation && (
                <div className="sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    HOD of Operations&apos; Recommendation
                  </span>
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {app.hodOpsRecommendation}
                  </div>
                </div>
              )}
              {app.psRejectionReason && (
                <div className="sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Returned by the Permanent Secretary
                  </span>
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {app.psRejectionReason}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Inspector Recommendation</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border",
                  app.recommendation?.includes("Approved") 
                    ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                    : app.recommendation === "Rejected"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-secondary text-secondary-foreground"
                )}>
                  {app.recommendation || "Pending Evaluation"}
                </span>
              </div>
              
              {/* Verified checklist — declared vs. found, so the HOD can
                  weigh discrepancies rather than read prose alone. */}
              {checklist.length > 0 && (
                <div className="sm:col-span-2 border-t pt-5 mt-2">
                  <h4 className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" /> Inspection Checklist
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {verifiedCount} verified · {partialCount} partial · {failedCount} not found
                  </p>

                  <div className="space-y-4">
                    {(["E", "F", "G"] as const).map((sec) => {
                      const rows = checklist.filter((c) => c.section === sec);
                      if (rows.length === 0) return null;
                      return (
                        <div key={sec}>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            {SECTION_TITLES[sec]}
                          </p>
                          <ul className="rounded-xl border divide-y overflow-hidden">
                            {rows.map((c) => (
                              <li key={c.key} className="p-3 bg-card">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Declared: {c.declared}
                                    </p>
                                    {c.note && (
                                      <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                                        Inspector: {c.note}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold",
                                      c.verified === "YES"
                                        ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                                        : c.verified === "PARTIAL"
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                        : c.verified === "NO"
                                        ? "bg-destructive/10 text-destructive border-destructive/20"
                                        : "bg-secondary text-secondary-foreground",
                                    )}>
                                    {c.verified === "YES"
                                      ? "Verified"
                                      : c.verified === "PARTIAL"
                                      ? "Partial"
                                      : c.verified === "NO"
                                      ? "Not found"
                                      : "Unanswered"}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evidence gallery — images render inline so the HOD can see
                  the site without downloading each file. */}
              {evidence.length > 0 && (
                <div className="sm:col-span-2 border-t pt-5 mt-2">
                  <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" /> Site Evidence ({evidence.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {evidence.map((ev) => {
                      const isImg = /\.(png|jpe?g|webp|gif|avif)$/i.test(ev.url);
                      return (
                        <a
                          key={ev.url}
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl border overflow-hidden bg-secondary/40 hover:border-primary/50 transition-colors">
                          {isImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ev.url}
                              alt={ev.caption ?? "Site evidence"}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                              {ev.caption ?? "Document"}
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground truncate px-2 py-1">
                            {ev.caption ?? "Evidence"}
                          </p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2 border-t pt-5 mt-2">
                <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Signatures & Executive Approvals
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-xs text-muted-foreground block mb-1">HOD Parks Revalidation</span>
                    <p className="font-semibold text-xs text-foreground">
                      {app.hodApprovedAt ? `✓ Signed on ${app.hodApprovedAt.toLocaleDateString("en-GB")}` : "⏳ Pending Signature"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-xs text-muted-foreground block mb-1">Permanent Secretary</span>
                    <p className="font-semibold text-xs text-foreground">
                      {app.psApprovedAt ? `✓ Signed on ${app.psApprovedAt.toLocaleDateString("en-GB")}` : "⏳ Pending Signature"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-xs text-muted-foreground block mb-1">Hon. Commissioner</span>
                    <p className="font-semibold text-xs text-foreground">
                      {app.commissionerApprovedAt ? `✓ Signed on ${app.commissionerApprovedAt.toLocaleDateString("en-GB")}` : "⏳ Pending Signature"}
                    </p>
                  </div>
                </div>
              </div>

              {app.revalidationNumber && (
                <div className="sm:col-span-2 p-5 bg-green-500/10 border-2 border-green-500/30 rounded-xl mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-green-800 dark:text-green-300 block mb-1 text-xs uppercase tracking-wider font-bold">Official Revalidation Certificate Number</span>
                    <p className="font-mono font-bold text-2xl text-green-900 dark:text-green-100">{app.revalidationNumber}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Two documents come out of one approval: the letter that
                        conveys the decision, and the certificate the park
                        displays. */}
                    <Link
                      href={`/admin/revalidation-queue/${app.id}/certificate`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-600/40 px-3.5 py-2 text-sm font-semibold text-green-700 dark:text-green-300 hover:bg-green-600/10 transition-colors">
                      Approval letter
                    </Link>
                    <Link
                      href={`/admin/revalidation-queue/${app.id}/park-certificate`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                      Revalidation certificate
                    </Link>
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <WorkflowActions 
            applicationId={app.id}
            terms={{
              monthlyFeeAmount: app.monthlyFeeAmount,
              previousMonthlyFeeAmount: app.previousMonthlyFeeAmount,
              effectiveFrom: app.effectiveFrom,
              requiredFacilities: app.requiredFacilities,
            }}
            status={app.status}
            role={session.role}
            currentUserId={session.userId}
            inspectors={inspectors}
            team={team}
            psRejectionReason={app.psRejectionReason}
          />

          <Card className="bg-muted/30 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Verification Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <p>
                <strong>1. Site Inspection:</strong> Field inspectors must physically verify every facility listed in Section E and confirm regulatory compliance in Section F.
              </p>
              <p>
                <strong>2. Staff & Revenue:</strong> Compare on-site personnel against Section G counts and check manifest records.
              </p>
              <p>
                <strong>3. Sign-off Chain:</strong> HOD review → Permanent Secretary review → Hon. Commissioner final signature.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

