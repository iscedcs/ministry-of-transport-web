import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export const metadata = {
  title: "Park Monitors Administration | Ministry of Transport",
};

export default async function ParkMonitorsAdminPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const isExecutive = session.role === "COMMISSIONER" || session.role === "PERMANENT_SECRETARY";
  const isHod = session.role === "HOD_PARKS" || session.role === "SYSTEM_ADMIN";

  if (!isExecutive && !isHod) {
    redirect("/dashboard");
  }

  // Fetch applications based on role priority
  let whereClause = {};
  
  if (isExecutive) {
    // Executives mainly care about SUBMITTED/UNDER_REVIEW/WAITLISTED to make decisions
    whereClause = {
      status: {
        in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED", "APPROVED", "REJECTED"],
      }
    };
  } else if (isHod) {
    // HODs care about APPROVED applications that need ID issuance
    whereClause = {
      status: "APPROVED"
    };
  }

  const applications = await db.parkMonitorApplication.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true }
      }
    }
  });

  // Let's get payments if we need to see if payment is complete
  // To avoid N+1, just map them if needed, or query them. Since it's an admin view, we can just do a basic join
  const appsWithPaymentStatus = await Promise.all(applications.map(async (app) => {
    let paymentCompleted = false;
    if (app.idCardPaymentId) {
      const payment = await db.payment.findUnique({
        where: { id: app.idCardPaymentId }
      });
      if (payment?.status === "COMPLETED") paymentCompleted = true;
    }
    return { ...app, paymentCompleted };
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Park Monitors Administration</h1>
          <p className="text-sm text-muted-foreground">
            {isExecutive 
              ? "Review and approve Park Monitor applications." 
              : "Manage approved applications and issue ID cards."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {isExecutive ? "All submitted applications" : "Approved applications ready for ID issuance"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>LGA</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appsWithPaymentStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                appsWithPaymentStatus.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.firstName} {app.surname}</div>
                      <div className="text-xs text-muted-foreground">{app.emailAddress}</div>
                    </TableCell>
                    <TableCell>{app.lga}</TableCell>
                    <TableCell>{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <StatusPill status={app.status as any} />
                    </TableCell>
                    <TableCell>
                      {app.idCardIssued ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Issued</span>
                      ) : app.paymentCompleted ? (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Paid - Ready to Issue</span>
                      ) : app.status === "APPROVED" ? (
                        <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-full">Awaiting Payment</span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/park-monitors/${app.id}`}>
                          {isExecutive && app.status === "SUBMITTED" ? "Review" : "View Details"}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
