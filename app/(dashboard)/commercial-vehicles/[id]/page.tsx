import { redirect, notFound } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { getCvrViewRoles, getCvrWriteRoles, getCvrVinRoles } from "@/lib/cvr-roles";
import { getCvrVehicle } from "@/app/actions/cvr";
import VehicleDetailClient from "./vehicle-detail-client";

export const metadata = {
  title: "Vehicle Details — Ministry of Transport",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    edit?: string;
  }>;
}

export default async function CommercialVehicleDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) redirect("/unauthorized");

  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const initialEditOpen = sp.edit === "true";

  const res = await getCvrVehicle(id);
  if (!res.success || !res.vehicle) {
    notFound();
  }

  const { getCvrLgasAndTowns } = await import("@/app/actions/cvr");
  const [writeRoles, vinRoles, lgasRes] = await Promise.all([
    getCvrWriteRoles(),
    getCvrVinRoles(),
    getCvrLgasAndTowns(),
  ]);

  const canWrite = writeRoles.includes(session.role);
  const canAssignVin = vinRoles.includes(session.role);
  const lgas = lgasRes.success ? lgasRes.lgas : [];

  return (
    <VehicleDetailClient
      vehicle={res.vehicle as any}
      userRole={session.role}
      canWrite={canWrite}
      canAssignVin={canAssignVin}
      lgas={lgas}
      initialEditOpen={initialEditOpen}
    />
  );
}
