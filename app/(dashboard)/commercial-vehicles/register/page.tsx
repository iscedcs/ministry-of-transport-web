import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { getCvrWriteRoles } from "@/lib/cvr-roles";
import { getCvrLgasAndTowns } from "@/app/actions/cvr";
import RegisterClient from "./register-client";

export const metadata = {
  title: "Register Commercial Vehicle — Ministry of Transport",
};

export default async function RegisterCommercialVehiclePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const writeRoles = await getCvrWriteRoles();
  const authz = await authorize(writeRoles);
  if (!authz.ok) redirect("/unauthorized");

  const lgasRes = await getCvrLgasAndTowns();
  const lgas = lgasRes.success ? lgasRes.lgas : [];

  return <RegisterClient lgas={lgas} userRole={session.role} />;
}
