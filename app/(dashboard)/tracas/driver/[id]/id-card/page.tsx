import { getTracasDriverData } from "@/app/actions/tracas";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import { DriverIdCard } from "@/components/tracas/driver-id-card";
import { SIGNATURES } from "@/lib/signatures";

export default async function TracasDriverIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await getTracasDriverData(id);
  if (!res.success || !res.driver) notFound();

  const driver = res.driver;

  return (
    <div className="max-w-4xl mx-auto space-y-8 print:m-0 print:space-y-0 print:w-full py-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Driver Official ID Card</h1>
          <p className="text-sm text-muted-foreground">
            {driver.fullName} — front and reverse
          </p>
        </div>
        <PrintButton />
      </div>

      <DriverIdCard
        driver={driver}
        // Injected here rather than imported by the client component, so the
        // signature images never reach a public bundle.
        signatures={{
          commissioner: SIGNATURES.commissioner,
          tracasMd: SIGNATURES.tracasMd,
        }}
      />
    </div>
  );
}
