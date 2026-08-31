/**
 * Dedicated Executive Letter Approval Center — Ministry of Transport Platform
 *
 * Dedicated page for the Honourable Commissioner, Permanent Secretary,
 * and Ministry Administrators to search, review, and approve all letters,
 * permits, and certificates across Ministry operations.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getExecutiveLetterApprovalQueue } from "@/app/actions/letter-approvals";
import { LetterApprovalsClient } from "./letter-approvals-client";

export const metadata = {
  title: "Letter Approvals — Ministry of Transport",
};

interface PageProps {
  searchParams?: Promise<{
    q?: string;
    module?: string;
  }>;
}

export default async function ExecutiveLetterApprovalsPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedRoles = [
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
    "ADMIN",
  ];
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  const sp = searchParams ? await searchParams : {};
  const initialQuery = sp.q ?? "";
  const initialModule = sp.module ?? "ALL";

  const res = await getExecutiveLetterApprovalQueue();
  if (!res.success) {
    redirect("/dashboard");
  }

  return (
    <LetterApprovalsClient
      data={res.data}
      role={session.role}
      initialQuery={initialQuery}
      initialModule={initialModule}
    />
  );
}
