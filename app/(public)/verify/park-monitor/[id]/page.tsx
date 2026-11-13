import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

/**
 * Public verification for a Park Monitor ID card — the page the card's QR code
 * opens. Deliberately minimal: name, photo, area and ID number are enough to
 * confirm the person in front of you. NIN, phone and address stay private.
 *
 * Only an APPROVED application whose ID has actually been issued verifies;
 * anything else is a 404, so a pending or rejected applicant can never be
 * "verified" by guessing an id.
 */
export default async function VerifyParkMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await db.parkMonitorApplication.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      otherNames: true,
      surname: true,
      lga: true,
      communityTown: true,
      status: true,
      idCardIssued: true,
      idCardIssuedAt: true,
      idCardPhotoUrl: true,
    },
  });

  if (!app || app.status !== "APPROVED" || !app.idCardIssued) notFound();

  const name = [app.firstName, app.otherNames, app.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl">
        <div className="relative z-10 bg-green-600 px-6 pb-20 pt-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold">Verified Park Monitor</h1>
          <p className="text-sm text-green-100">
            Ministry of Transport, Anambra State
          </p>
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-0">
          <div className="z-10 -mt-16">
            {app.idCardPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.idCardPhotoUrl}
                alt={name}
                className="h-32 w-32 rounded-full border-4 border-white bg-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-3xl font-bold text-slate-600 shadow-lg">
                {name[0]}
              </div>
            )}
          </div>

          <h2 className="mt-4 text-center text-2xl font-bold">{name}</h2>
          <Badge className="mt-2 border-primary/20 bg-primary/10 text-sm text-primary hover:bg-primary/20">
            Park Monitor
          </Badge>

          <div className="mt-8 w-full space-y-4">
            <div className="flex justify-between border-b border-slate-100 py-3">
              <span className="text-sm text-slate-500">ID issued</span>
              <span className="font-medium">
                {app.idCardIssuedAt
                  ? format(app.idCardIssuedAt, "d MMM yyyy")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-3">
              <span className="text-sm text-slate-500">Area</span>
              <span className="max-w-[60%] text-right font-medium">
                {[app.communityTown, app.lga].filter(Boolean).join(", ") ||
                  "Anambra State"}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-slate-500">ID Number</span>
              <span className="font-mono font-medium">
                PM-{app.id.slice(0, 6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
