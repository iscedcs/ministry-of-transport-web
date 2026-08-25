import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getRevalidationDueAssets } from "@/lib/revalidation-due";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";

export default async function RevalidationDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // If the user is an applicant, show their revalidation applications
  if (session.role !== "EXTERNAL_APPLICANT") {
    redirect("/admin/revalidation-queue");
  }
  
  // What they hold that is coming up for renewal, so they pick rather than
  // retype what the Ministry already has on file.
  const { assets: dueAssets, windowDays } = await getRevalidationDueAssets(
    session.userId,
  );

  const applications = await db.revalidationApplication.findMany({
    where: { applicantUserId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">My Revalidations</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your motor park and facility revalidation applications.</p>
        </div>
        <Button asChild>
          <Link href="/revalidation/apply">New Revalidation</Link>
        </Button>
      </div>

      {/* Due for revalidation */}
      {dueAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due for revalidation</CardTitle>
            <CardDescription>
              These approvals expire within {windowDays} days or have already
              lapsed. Pick one to begin — its details are carried over.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dueAssets.map((asset) => (
              <div
                key={`${asset.kind}-${asset.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {asset.kind === "MASS_TRANSIT" ? "Mass transit" : "Motor park"}
                    {asset.location ? ` · ${asset.location}` : ""}
                    {asset.reference ? ` · ${asset.reference}` : ""}
                  </p>
                  <p
                    className={
                      asset.overdue
                        ? "mt-1 text-xs font-semibold text-destructive"
                        : "mt-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                    }>
                    {asset.overdue
                      ? `Overdue since ${asset.dueAt.toDateString()}`
                      : `Due ${asset.dueAt.toDateString()} — ${asset.daysRemaining} day${
                          asset.daysRemaining === 1 ? "" : "s"
                        } left`}
                  </p>
                </div>

                {asset.inProgress ? (
                  // Offering it again would produce a second application for
                  // the same approval, inspected and certificated separately.
                  <span className="text-xs text-muted-foreground">
                    Already in the queue
                  </span>
                ) : (
                  <Button asChild size="sm">
                    <Link
                      href={`/revalidation/apply?assetType=${asset.kind}&assetId=${asset.id}`}>
                      Start revalidation
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <CardTitle className="text-lg mb-2">No Applications Found</CardTitle>
          <CardDescription className="mb-6 max-w-sm">
            You haven&apos;t submitted any revalidation applications yet. Click the button below to start.
          </CardDescription>
          <Button asChild>
            <Link href="/revalidation/apply">Start Application</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card
              key={app.id}
              className={
                app.status === "REJECTED" ? "border-destructive/40" : undefined
              }>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{app.parkName}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{app.physicalLocation}, {app.lga}</p>
                  <p className="text-xs text-muted-foreground">Applied: {app.createdAt.toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <StatusPill 
                    status={
                      ["APPROVED", "REJECTED", "SUBMITTED"].includes(app.status) 
                        ? (app.status as any) 
                        : "UNDER_REVIEW"
                    } 
                  />
                  {app.revalidationNumber && (
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                      {app.revalidationNumber}
                    </span>
                  )}
                  </div>
                </div>

                {/* Why it came back. Without this the applicant sees only a
                    red pill and has nothing to act on. */}
                {app.status === "REJECTED" && app.rejectionReason && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-destructive">
                      Returned by the Ministry — what to correct
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {app.rejectionReason}
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/revalidation/apply">
                        Correct and resubmit
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
