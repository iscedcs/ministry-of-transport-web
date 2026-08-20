/**
 * TRACAS driver detail.
 *
 * Readable by every Ministry role with fleet visibility — this is where an
 * officer checks a record before an ID card is approved. Editable only by
 * DRIVER_EDIT_ROLES: the Enumerator who captured the driver, and the two
 * administrative roles.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTracasDriverDetail } from "@/app/actions/tracas";
import { DriverDetailClient } from "./driver-detail-client";

export default async function TracasDriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const res = await getTracasDriverDetail(id);
  if (!res.success) {
    // A permission failure is a redirect; a missing record is a 404.
    if (res.error.toLowerCase().includes("not found")) notFound();
    redirect("/unauthorized");
  }

  return (
    <DriverDetailClient
      driver={res.data as never}
      currentUserRole={session.role}
    />
  );
}
