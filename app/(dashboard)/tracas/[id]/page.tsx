/**
 * TRACAS vehicle detail.
 *
 * Readable by every Ministry role with fleet visibility; editable only by
 * those in FLEET_WRITE_ROLES (Enumerator, Commissioner, System Admin).
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTracasVehicleDetail } from "@/app/actions/tracas";
import { VehicleDetailClient } from "./vehicle-detail-client";

export default async function TracasVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const res = await getTracasVehicleDetail(id);
  if (!res.success) {
    // A permission failure is a redirect; a missing record is a 404.
    if (res.error.toLowerCase().includes("not found")) notFound();
    redirect("/unauthorized");
  }

  return (
    <VehicleDetailClient
      vehicle={res.data as never}
      currentUserRole={session.role}
    />
  );
}
