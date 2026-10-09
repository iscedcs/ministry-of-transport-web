import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { LOGISTICS_BASE_VIEW_ROLES, LOGISTICS_BASE_WRITE_ROLES } from "@/lib/logistics-roles";
import { listLogisticsApplicants } from "@/app/actions/logistics";
import type { ApplicationStatus } from "@prisma/client";
import LogisticsClient from "./logistics-client";

export const metadata = {
  title: "Logistics — Ministry of Transport",
};

const VALID_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "PENDING_PS_APPROVAL",
  "PENDING_COMMISSIONER_APPROVAL",
  "APPROVED",
  "REJECTED",
];

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}

export default async function LogisticsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(LOGISTICS_BASE_VIEW_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const canWrite = LOGISTICS_BASE_WRITE_ROLES.includes(session.role);

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const search = sp.q ?? "";
  const status = VALID_STATUSES.includes(sp.status as ApplicationStatus)
    ? (sp.status as ApplicationStatus)
    : undefined;

  const result = await listLogisticsApplicants({ page, search, status });

  return (
    <LogisticsClient
      applicants={result.success ? result.applicants : []}
      stats={result.success ? result.stats : { total: 0, approved: 0, pending: 0 }}
      pagination={
        result.success
          ? result.pagination
          : { page: 1, pageSize: 25, total: 0, totalPages: 1 }
      }
      statusFilter={status}
      searchQuery={search}
      canWrite={canWrite}
    />
  );
}
