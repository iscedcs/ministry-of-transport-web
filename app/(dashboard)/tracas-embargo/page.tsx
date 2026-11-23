import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listEmbargoes } from "@/app/actions/tracas-embargo";
import { EMBARGO_LIFT_ROLES, EMBARGO_PLACE_ROLES } from "@/lib/fleet-roles";
import { EmbargoClient } from "./embargo-client";

export const metadata = {
  title: "TRACAS Embargo Pool — Ministry of Transport",
};

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}

export default async function TracasEmbargoPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const status =
    sp.status === "LIFTED" || sp.status === "ALL" ? sp.status : "ACTIVE";

  const res = await listEmbargoes({
    status,
    search: sp.q ?? "",
    page: Number(sp.page ?? 1) || 1,
  });
  if (!res.success) redirect("/unauthorized");

  return (
    <EmbargoClient
      role={session.role}
      rows={res.rows}
      total={res.total}
      page={res.page}
      totalPages={res.totalPages}
      activeCount={res.activeCount}
      status={status}
      search={sp.q ?? ""}
      canPlace={(EMBARGO_PLACE_ROLES as string[]).includes(session.role)}
      canLift={(EMBARGO_LIFT_ROLES as string[]).includes(session.role)}
    />
  );
}
