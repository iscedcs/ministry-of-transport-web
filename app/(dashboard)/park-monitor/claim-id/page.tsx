import { ClaimIdForm } from "@/components/park-monitor/claim-id-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = {
  title: "Claim Park Monitor ID | Ministry of Transport",
};

export default async function ClaimParkMonitorIdPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.role !== "EXTERNAL_APPLICANT" && session.role !== "PARK_MONITOR") {
    redirect("/dashboard");
  }

  const app = await db.parkMonitorApplication.findUnique({
    where: { userId: session.userId },
  });

  if (!app) {
    redirect("/dashboard");
  }

  if (app.status !== "APPROVED") {
    redirect("/dashboard");
  }

  if (app.idCardPaymentId) {
    redirect("/dashboard"); // Payment already completed or pending, view status on dashboard
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <ClaimIdForm currentPhotoUrl={app.idCardPhotoUrl} />
    </div>
  );
}
