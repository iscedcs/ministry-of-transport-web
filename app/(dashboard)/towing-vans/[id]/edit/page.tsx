import { notFound, redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { TOWING_BASE_WRITE_ROLES } from "@/lib/towing-roles";
import { getTowingVan, getTowingLgas } from "@/app/actions/towing";
import EditTowingVanClient from "./edit-client";

export const metadata = {
  title: "Edit Towing Van — Ministry of Transport",
};

export default async function EditTowingVanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(TOWING_BASE_WRITE_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const { id } = await params;
  const [vanResult, lgaResult] = await Promise.all([getTowingVan(id), getTowingLgas()]);
  if (!vanResult.success) notFound();

  return (
    <EditTowingVanClient
      van={vanResult.van}
      lgas={lgaResult.success ? lgaResult.lgas : []}
    />
  );
}
