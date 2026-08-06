import { notFound } from "next/navigation";
import { getTracasAuthorityLetterData } from "@/app/actions/tracas";
import { LetterOfAuthorityDocument } from "@/components/tracas/letter-of-authority";
import { SIGNATURES } from "@/lib/signatures";

export default async function TracasLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getTracasAuthorityLetterData(id);

  if (!res.success || !res.vehicle) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-900/5 dark:bg-slate-950 flex flex-col items-center print:p-0 print:min-h-0">
      <LetterOfAuthorityDocument
        vehicle={res.vehicle as any}
        showActions={true}
        // Signatures are injected here, from this authenticated server route,
        // rather than imported by the client component — so the images never
        // land in a public bundle or become fetchable by URL.
        signatures={{
          commissioner: SIGNATURES.commissioner,
          tracasMd: SIGNATURES.tracasMd,
        }}
      />
    </div>
  );
}
