import { OnboardStaffForm } from "@/components/park-staff/onboard-staff-form";

export default async function NewStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Onboard New Staff</h1>
        <p className="text-muted-foreground">Add a new verified staff member to your park.</p>
      </div>
      <OnboardStaffForm parkId={id} />
    </div>
  );
}
