import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { LOGISTICS_BASE_WRITE_ROLES } from "@/lib/logistics-roles";
import RegisterLogisticsClient from "./register-client";

export const metadata = {
  title: "Register Logistics — Ministry of Transport",
};

export default async function RegisterLogisticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(LOGISTICS_BASE_WRITE_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  return <RegisterLogisticsClient />;
}
