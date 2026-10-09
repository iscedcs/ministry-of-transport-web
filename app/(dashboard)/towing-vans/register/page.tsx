import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { TOWING_BASE_WRITE_ROLES } from "@/lib/towing-roles";
import { getTowingLgas } from "@/app/actions/towing";
import RegisterTowingVanClient from "./register-client";

export const metadata = {
  title: "Register Towing Van — Ministry of Transport",
};

export default async function RegisterTowingVanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(TOWING_BASE_WRITE_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const lgaResult = await getTowingLgas();
  const lgas = lgaResult.success ? lgaResult.lgas : [];

  return <RegisterTowingVanClient lgas={lgas} />;
}
