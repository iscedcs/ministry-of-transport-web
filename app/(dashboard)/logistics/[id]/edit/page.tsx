import { notFound, redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { LOGISTICS_EDIT_ROLES } from "@/lib/logistics-roles";
import { getLogisticsApplicant } from "@/app/actions/logistics";
import EditLogisticsClient from "./edit-client";

export const metadata = {
  title: "Edit Logistics Applicant — Ministry of Transport",
};

export default async function EditLogisticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(LOGISTICS_EDIT_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const { id } = await params;
  const result = await getLogisticsApplicant(id);
  if (!result.success) notFound();

  return <EditLogisticsClient applicant={result.applicant} />;
}
