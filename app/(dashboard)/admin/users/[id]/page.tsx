import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStaffUser } from "@/app/actions/admin";
import { EditStaffForm } from "./edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStaffPage({ params }: PageProps) {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const { id } = await params;
  const result = await getStaffUser(id);
  if (!result.success) notFound();

  return <EditStaffForm user={result.data!} />;
}
