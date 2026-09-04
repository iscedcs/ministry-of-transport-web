import { redirect } from "next/navigation";
import { getSession, authorize } from "@/lib/auth";
import { getCvrViewRoles, getCvrWriteRoles } from "@/lib/cvr-roles";
import { getCvrVehicles, getCvrDrivers } from "@/app/actions/cvr";
import type { CvrRegistrationStatus } from "@prisma/client";
import CommercialVehiclesClient from "./commercial-vehicles-client";

export const metadata = {
  title: "Commercial Vehicles — Ministry of Transport",
};

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function CommercialVehiclesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewRoles = await getCvrViewRoles();
  const authz = await authorize(viewRoles);
  if (!authz.ok) redirect("/unauthorized");

  const writeRoles = await getCvrWriteRoles();
  const canWrite = writeRoles.includes(session.role);

  const sp = await searchParams;
  const activeTab = sp.tab === "drivers" ? "drivers" : "vehicles";
  const page = Math.max(1, Number(sp.page) || 1);
  const searchQuery = sp.q ?? "";
  const statusFilter =
    sp.status === "REGISTERED" || sp.status === "IDENTIFIED"
      ? (sp.status as CvrRegistrationStatus)
      : undefined;

  const [vehiclesRes, driversRes] = await Promise.all([
    getCvrVehicles({
      page,
      search: searchQuery,
      status: statusFilter,
    }),
    getCvrDrivers({
      page,
      search: searchQuery,
    }),
  ]);

  const vehiclesOk = vehiclesRes.success;
  const driversOk = driversRes.success;

  const vehicles = vehiclesOk ? vehiclesRes.vehicles : [];
  const drivers = driversOk ? driversRes.drivers : [];

  const stats = {
    total: vehiclesOk ? vehiclesRes.stats.total : 0,
    identified: vehiclesOk ? vehiclesRes.stats.identified : 0,
    pendingVin: vehiclesOk ? vehiclesRes.stats.pendingVin : 0,
    driverTotal: driversOk ? driversRes.pagination.total : 0,
  };

  const pagination =
    activeTab === "vehicles" && vehiclesOk
      ? vehiclesRes.pagination
      : activeTab === "drivers" && driversOk
      ? driversRes.pagination
      : { page: 1, pageSize: 25, total: 0, totalPages: 1 };

  return (
    <CommercialVehiclesClient
      vehicles={vehicles}
      drivers={drivers}
      stats={stats}
      pagination={pagination}
      activeTab={activeTab}
      statusFilter={statusFilter}
      searchQuery={searchQuery}
      userRole={session.role}
      canWrite={canWrite}
    />
  );
}
