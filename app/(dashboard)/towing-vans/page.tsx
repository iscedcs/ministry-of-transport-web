import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { TOWING_BASE_VIEW_ROLES, TOWING_BASE_WRITE_ROLES } from "@/lib/towing-roles";
import { listTowingVans } from "@/app/actions/towing";
import type { TowingVanStatus } from "@prisma/client";
import TowingVansClient from "./towing-vans-client";

export const metadata = {
  title: "Towing Vans — Ministry of Transport",
};

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}

export default async function TowingVansPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(TOWING_BASE_VIEW_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const canWrite = TOWING_BASE_WRITE_ROLES.includes(session.role);

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const search = sp.q ?? "";
  const status =
    sp.status === "REGISTERED" || sp.status === "PERMIT_ISSUED"
      ? (sp.status as TowingVanStatus)
      : undefined;

  const result = await listTowingVans({ page, search, status });

  return (
    <TowingVansClient
      vans={result.success ? result.vans : []}
      stats={result.success ? result.stats : { total: 0, issued: 0, pending: 0 }}
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
