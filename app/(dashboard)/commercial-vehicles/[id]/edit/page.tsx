import { redirect } from "next/navigation";

export default async function EditCommercialVehicleRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/commercial-vehicles/${id}?edit=true`);
}
