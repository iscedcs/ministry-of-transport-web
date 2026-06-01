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
import { APPLICANT_SERVICE_CARDS } from "@/lib/service-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const summary = await getParkStatusSummary();
  const stats = summary.success ? summary.data! : null;

  const isApplicant = session.role === "EXTERNAL_APPLICANT";
  const isExecutive =
    session.role === "COMMISSIONER" || session.role === "PERMANENT_SECRETARY";
  const isStaff = !isApplicant;

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

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            {isApplicant ? "My Applications" : "Platform Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isApplicant
              ? "Track the status of your motor park applications."
              : "Real-time view of all applications and workflow activity."}
          </p>
        </div>
        {isApplicant && (
          <Button asChild>
            <Link href="/motor-parks/apply">New Application</Link>
          </Button>
        )}
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isApplicant ? (
            <>
              <StatCard label="Total Submitted" value={stats.total} />
              <StatCard
                label="Under Review"
                value={stats.underReview + stats.inspectionScheduled}
              />
              <StatCard label="Approved" value={stats.approved} />
              <StatCard
                label="Pending Payments"
                value={stats.pendingPayments}
                deltaDirection={stats.pendingPayments > 0 ? "down" : "neutral"}
                delta={stats.pendingPayments > 0 ? "Payment required" : undefined}
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
      )}

      {/* Quick links */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/motor-parks">
              {isApplicant ? "My Motor Parks" : "Motor Parks Queue"}
            </Link>
          </Button>
          {isApplicant && (
            <Button asChild variant="outline" size="sm">
              <Link href="/motor-parks/apply">Submit Application</Link>
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

      {/* Payment Reminder Card — only for applicants with pending payments */}
      {isApplicant && stats && stats.pendingPayments > 0 && (
        <Card className="border-l-4 border-l-amber-500 border-border bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">Payment Reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 dark:text-amber-200 mb-4">
              You have <span className="font-semibold">{stats.pendingPayments}</span> application{stats.pendingPayments !== 1 ? "s" : ""} awaiting payment. 
              Please complete payment to proceed with your application.
            </p>
            <Button asChild variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Link href="/motor-parks?status=SUBMITTED">View Applications</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isApplicant && availableServices.length > 0 && (
        <Card className="border-border/60 bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-base">Add another service to your account</CardTitle>
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
      {isStaff && stats && (
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
    </div>
  );
}
