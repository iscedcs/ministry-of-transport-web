import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import Link from "next/link";

export default async function RevalidationQueuePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only allow HOD_PARKS_REVALIDATION, HOD_PARKS, COMMISSIONER, PERMANENT_SECRETARY
  const allowedRoles = ["HOD_PARKS_REVALIDATION", "HOD_PARKS", "COMMISSIONER", "PERMANENT_SECRETARY", "SYSTEM_ADMIN"];
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  const applications = await db.revalidationApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { applicant: true },
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Revalidation Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and process park and facility revalidation applications.</p>
      </div>

      <div className="grid gap-4">
        {applications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <CardTitle className="text-lg mb-2">No Applications</CardTitle>
            <CardDescription>There are currently no revalidation applications in the queue.</CardDescription>
          </Card>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Applicant Name</th>
                  <th className="p-4 font-medium">Park Name</th>
                  <th className="p-4 font-medium">LGA</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4">{app.createdAt.toLocaleDateString()}</td>
                    <td className="p-4 font-medium">{app.ownerName}</td>
                    <td className="p-4">{app.parkName}</td>
                    <td className="p-4">{app.lga}</td>
                    <td className="p-4"><StatusPill status={app.status as any} /></td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/revalidation-queue/${app.id}`} className="text-primary hover:underline text-sm font-medium">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
