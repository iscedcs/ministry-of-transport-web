/**
 * Dashboard Home Page — Ministry of Transport Platform
 * STORY-033: Status dashboard / overview
 *
 * Shows summary stats (motor park applications by status) and quick actions
 * appropriate to the current user's role.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getParkStatusSummary } from "@/app/actions/motor-park";
import {
  APPLICANT_SERVICE_CARDS,
  SERVICE_LABELS,
  SERVICE_ROOT_ROUTES,
} from "@/lib/service-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { ExecutiveDashboard } from "./executive-dashboard";
import { getExecutiveDashboardStats } from "@/app/actions/executive-dashboard";
import { getRoleDashboard } from "@/lib/role-dashboard";
import { WorkQueues } from "@/components/dashboard/work-queues";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ICT_OFFICER" || session.role === "ICT_OFFICER_TRACAS") {
    redirect("/ict-printing");
  }

  if (session.role === "ENUMERATOR") {
    redirect("/enumerator");
  }

  if (session.role === "TRACAS_MD") {
    redirect("/tracas-approvals");
  }

  const summary = await getParkStatusSummary();
  const stats = summary.success ? summary.data! : null;

  const isApplicant = session.role === "EXTERNAL_APPLICANT";
  const isExecutive =
    session.role === "COMMISSIONER" ||
    session.role === "PERMANENT_SECRETARY" ||
    session.role === "SYSTEM_ADMIN";
  const isParkMonitor = session.role === "PARK_MONITOR";
  const isStaff = !isApplicant && !isParkMonitor;

  const roleDashboard =
    !isApplicant && !isParkMonitor
      ? await getRoleDashboard(session.role, session.userId)
      : null;

  let execStats = null;
  let execError = null;
  if (isExecutive) {
    const res = await getExecutiveDashboardStats();
    if (res.success) {
      execStats = res.data;
    } else {
      execError = res.error;
    }
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { registeredService: true },
  });

  const currentServices = user?.registeredService
    ? user.registeredService.split(",").map((service) => service.trim())
    : [];

  const availableServices = isApplicant
    ? APPLICANT_SERVICE_CARDS.filter(
        (service) => !currentServices.includes(service.id),
      )
    : [];

  const canManageParkMonitors =
    isExecutive ||
    session.role === "HOD_PARKS" ||
    session.role === "SYSTEM_ADMIN";

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            {isApplicant
              ? "My Applications"
              : isParkMonitor
                ? "Park Monitor Dashboard"
                : isExecutive
                  ? "Executive Dashboard"
                  : "Platform Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isApplicant
              ? "Track the status of your motor park applications."
              : isParkMonitor
                ? "Manage your park monitor profile and claim your ID."
                : "Real-time view of all applications and workflow activity."}
          </p>
        </div>
        {/* {isApplicant && (
          <Button asChild>
            <Link href="/motor-parks/apply">New Application</Link>
          </Button>
        )} */}
      </div>

      {/* What is sitting on this user's desk */}
      {roleDashboard && <WorkQueues data={roleDashboard} />}

      {/* Stats grid */}
      {isExecutive ? (
        <ExecutiveDashboard initialStats={execStats} error={execError} />
      ) : (
        stats &&
        !isParkMonitor &&
        (isApplicant || stats.total > 0) &&
        (!isApplicant || currentServices.includes("MOTOR_PARK")) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isApplicant ? (
              <>
                <StatCard label="Total Motor Parks" value={stats.total} />
                <StatCard
                  label="Under Review"
                  value={stats.underReview + stats.inspectionScheduled}
                />
                <StatCard label="Approved" value={stats.approved} />
                <StatCard
                  label="Pending Payments"
                  value={stats.pendingPayments}
                  deltaDirection={
                    stats.pendingPayments > 0 ? "down" : "neutral"
                  }
                  delta={
                    stats.pendingPayments > 0 ? "Payment required" : undefined
                  }
                />
              </>
            ) : (
              <>
                <StatCard label="Total Applications" value={stats.total} />
                <StatCard
                  label="Pending Review"
                  value={stats.submitted + stats.underReview}
                />
                <StatCard
                  label="Awaiting Inspection"
                  value={stats.inspectionScheduled}
                />
                <StatCard
                  label="Pending Approval"
                  value={stats.pendingApproval}
                  deltaDirection={stats.pendingApproval > 0 ? "up" : "neutral"}
                />
              </>
            )}
          </div>
        )
      )}

      {/* Quick links */}
      {!isParkMonitor && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {isApplicant ? (
              currentServices.map((serviceKey) => {
                const label =
                  SERVICE_LABELS[serviceKey as keyof typeof SERVICE_LABELS];
                const route =
                  SERVICE_ROOT_ROUTES[
                    serviceKey as keyof typeof SERVICE_ROOT_ROUTES
                  ];
                if (!label || !route) return null;
                return (
                  <div key={serviceKey} className="contents">
                    <Button asChild variant="outline" size="sm">
                      <Link href={route}>My {label}s</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${route}/apply`}>New {label}</Link>
                    </Button>
                  </div>
                );
              })
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/motor-parks">Motor Parks Queue</Link>
              </Button>
            )}

            {isStaff && (
              <Button asChild variant="outline" size="sm">
                <Link href="/inspections">Inspections</Link>
              </Button>
            )}
            {isExecutive && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">Staff &amp; Users</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Payment Reminder Card — only for applicants with pending payments */}
      {isApplicant && stats && stats.pendingPayments > 0 && (
        <Card className="border-l-4 border-l-amber-500 border-border bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">
              Payment Reminder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 dark:text-amber-200 mb-4">
              You have{" "}
              <span className="font-semibold">{stats.pendingPayments}</span>{" "}
              application{stats.pendingPayments !== 1 ? "s" : ""} awaiting
              payment. Please complete payment to proceed with your application.
            </p>
            <Button
              asChild
              variant="default"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700">
              <Link href="/motor-parks?status=SUBMITTED">
                View Applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isApplicant && availableServices.length > 0 && (
        <Card className="border-border/60 bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-base">
              Add another service to your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You can add another registered service and gain access to its
              workflows from the dashboard sidebar.
            </p>
            <Button asChild>
              <Link href="/dashboard/services">Choose a new service</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status breakdown (staff only) */}
      {isStaff && !isExecutive && stats && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Application Status Breakdown
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "SUBMITTED", count: stats.submitted },
              { label: "UNDER_REVIEW", count: stats.underReview },
              {
                label: "INSPECTION_SCHEDULED",
                count: stats.inspectionScheduled,
              },
              { label: "PENDING_APPROVAL", count: stats.pendingApproval },
              { label: "APPROVED", count: stats.approved },
              { label: "REJECTED", count: stats.rejected },
              { label: "REVOKED", count: stats.revoked },
            ]
              .filter((s) => s.count > 0)
              .map((s) => (
                <Link
                  key={s.label}
                  href={`/motor-parks?status=${s.label}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                  <StatusPill
                    status={
                      s.label as Parameters<typeof StatusPill>[0]["status"]
                    }
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {s.count}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Park Monitor Application Status */}
      {session.role === "PARK_MONITOR" && (
        <ParkMonitorStatusCard userId={session.userId} />
      )}

      {/* Commissioner/Executive/HOD Park Monitor Queue */}
      {canManageParkMonitors && <AdminParkMonitorCard />}
    </div>
  );
}

// Separate component to keep things clean
async function ParkMonitorStatusCard({ userId }: { userId: string }) {
  const app = await db.parkMonitorApplication.findUnique({
    where: { userId },
  });

  if (!app) {
    return (
      <Card className="border-border/60 bg-secondary/50">
        <CardHeader>
          <CardTitle className="text-base">Apply as a Park Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can apply to become a Park Monitor and join the Special
            Enforcement Unit.
          </p>
          <Button asChild>
            <Link href="/park-monitor/apply">Start Application</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isApproved = app.status === "APPROVED";
  const needsId = isApproved && !app.idCardIssued;

  return (
    <Card
      className={
        isApproved ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : ""
      }>
      <CardHeader>
        <CardTitle className="text-base">Park Monitor Application</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusPill status={app.status as any} />
        </div>

        {app.status === "SUBMITTED" && (
          <p className="text-sm text-muted-foreground">
            Your application has been received and is awaiting review.
          </p>
        )}
        {app.status === "WAITLISTED" && (
          <p className="text-sm text-muted-foreground">
            Your application has been waitlisted. We will contact you when a
            position opens.
          </p>
        )}
        {app.status === "REJECTED" && (
          <p className="text-sm text-red-600">
            Your application was rejected. Reason: {app.rejectionReason}
          </p>
        )}
        {needsId && !app.idCardPaymentId && (
          <div className="space-y-4">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Congratulations! Your application has been approved.
            </p>
            <p className="text-sm text-muted-foreground">
              Please proceed to claim your official ID card to complete your
              registration.
            </p>
            <Button
              asChild
              className="bg-green-600 hover:bg-green-700 text-white">
              <Link href="/park-monitor/claim-id">Claim Your ID</Link>
            </Button>
          </div>
        )}
        {needsId && app.idCardPaymentId && (
          <div className="space-y-4">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Payment Confirmed.
            </p>
            <p className="text-sm text-muted-foreground">
              Your application is being reviewed by an official. Please come
              back in 24hr to check your ID status, or pick up your ID from the
              HOD office.
            </p>
          </div>
        )}
        {app.idCardIssued && (
          <div className="space-y-4">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Your ID Card has been issued!
            </p>
            <p className="text-sm text-muted-foreground">
              You are now an official Park Monitor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Admin Component to show pending Park Monitor Applications
async function AdminParkMonitorCard() {
  const whereClause = {
    OR: [
      {
        status: {
          in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] as any,
        },
      },
      {
        status: "APPROVED" as any,
        idCardIssued: false,
      },
    ],
  };

  const pendingApps = await db.parkMonitorApplication.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  const totalPending = await db.parkMonitorApplication.count({
    where: whereClause,
  });

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pending Park Monitors</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Applications requiring your review.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{totalPending}</span>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Queue
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 p-0">
        {totalPending === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No pending applications.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingApps.map((app) => (
              <div
                key={app.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium">
                    {app.firstName} {app.surname}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {app.lga}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <StatusPill status={app.status as any} />
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/park-monitors/${app.id}`}>Review</Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t text-center bg-muted/10">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary">
            <Link href="/admin/park-monitors">
              View all park monitor applications
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
