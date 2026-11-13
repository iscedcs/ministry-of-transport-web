import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { cr80PrintCss } from "@/lib/card-spec";

/**
 * Park Monitor ID card — CR80 (ISO/IEC 7810 ID-1), front and back, laid out
 * exactly like the park staff card (see motor-parks/[id]/staff/[staffId]/id-card)
 * so the two badges look like one family and print through the same rules.
 *
 * Only an issued card can be printed: until the HOD issues the ID there is no
 * QR / verification URL, and a card without them must never leave the office.
 */
const PRINT_ROLES = [
  "HOD_PARKS",
  "SYSTEM_ADMIN",
  "ADMIN",
  "ICT_OFFICER",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
];

export default async function ParkMonitorIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (!PRINT_ROLES.includes(session.role)) redirect("/dashboard");

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
      idCardPhotoUrl: true,
      qrCodeUrl: true,
    },
  });

  if (!app || app.status !== "APPROVED" || !app.idCardIssued) notFound();

  const name = [app.firstName, app.otherNames, app.surname]
    .filter(Boolean)
    .join(" ")
    .trim();
  const code = `PM-${app.id.slice(0, 6).toUpperCase()}`;
  const area = [app.communityTown, app.lga].filter(Boolean).join(", ");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const verifyUrl = `${base}/verify/park-monitor/${app.id}`;
  // Falls back to a generated code if the stored one is missing, so the card
  // is never printed without a scannable mark.
  const qrSrc =
    app.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 print:m-0 print:max-w-none print:gap-0 print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{ __html: cr80PrintCss("monitor-id-sheet") }}
      />

      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/admin/park-monitors/${app.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to application
        </Link>
        <PrintButton />
      </div>

      <p className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground print:hidden">
        Card prints at CR80 — 53.98 × 85.60 mm, the same size as a bank card.
        Print at 100% scale; do not &ldquo;fit to page&rdquo;.
      </p>

      <div
        id="monitor-id-sheet"
        className="flex flex-wrap items-start justify-center gap-8">
        {/* ══════════════════ FRONT ══════════════════ */}
        <div
          data-face="front"
          className="cr80-card relative flex h-[647px] w-[408px] flex-col overflow-hidden rounded-2xl border-2 border-primary bg-white text-black shadow-xl print:shadow-none"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          <div className="flex justify-center bg-white pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/anambra_mot_logo.png"
              alt="Government of Anambra State"
              className="h-[64px] w-[64px]"
            />
          </div>

          <div className="bg-primary px-4 py-3 text-center text-primary-foreground">
            <h2 className="text-[17px] font-extrabold uppercase leading-tight">
              Ministry of Transport
            </h2>
            <p className="text-[13px] font-semibold uppercase opacity-90">
              Anambra State
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center px-5 pt-3">
            <div className="mb-2 h-[196px] w-[166px] overflow-hidden rounded-xl border-[3px] border-primary bg-gray-100">
              {app.idCardPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={app.idCardPhotoUrl}
                  className="h-full w-full object-cover"
                  alt={name}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-gray-400">
                  No photograph
                </div>
              )}
            </div>

            <h3 className="text-center text-[21px] font-extrabold uppercase leading-tight">
              {name}
            </h3>
            <p className="mt-1 text-center text-[15px] font-extrabold uppercase tracking-wider text-primary">
              Park Monitor
            </p>

            <div className="mt-3 w-full rounded-lg bg-gray-100 px-3 py-2 text-center">
              <p className="text-[11px] font-extrabold uppercase text-gray-500">
                Area
              </p>
              <p className="line-clamp-2 text-[14px] font-bold leading-snug">
                {area || "Anambra State"}
              </p>
            </div>

            <div className="mb-4 mt-auto flex w-full items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase leading-none text-gray-500">
                  ID Number
                </p>
                <p className="mt-1 break-all font-mono text-[15px] font-extrabold text-slate-900">
                  {code}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  className="h-[92px] w-[92px] border border-gray-300 bg-white p-0.5"
                  alt="Scan to verify this officer"
                />
                <span className="mt-0.5 text-[11px] font-extrabold uppercase text-gray-600">
                  Scan to verify
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════ BACK ══════════════════ */}
        <div
          data-face="back"
          className="cr80-card relative flex h-[647px] w-[408px] flex-col items-center overflow-hidden rounded-2xl border-2 border-primary bg-white px-5 pb-5 pt-6 text-center text-black shadow-xl print:shadow-none"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/anambra_mot_logo.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[230px] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
          />

          <p className="text-[13px] font-semibold leading-snug text-gray-700">
            This Identity Card is the property of
            <br />
            Anambra State Government.
          </p>
          <p className="mt-3 text-[13px] font-semibold leading-snug text-gray-700">
            If misplaced, kindly return it to
            <br />
            Ministry of Transport Office
          </p>

          <div className="relative mt-6 flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-[25px] font-extrabold uppercase tracking-wide">
              M.O.T
            </p>
            <p className="text-[19px] font-extrabold uppercase leading-tight text-primary">
              Approved Park Monitor
            </p>

            <p className="mt-2 font-mono text-[15px] font-extrabold text-slate-900">
              {code}
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              className="h-[140px] w-[140px] border border-gray-300 bg-white p-1"
              alt="Scan to verify this officer"
            />
            <span className="text-[12px] font-extrabold uppercase tracking-wide text-gray-600">
              Scan to verify Personnel
            </span>
          </div>

          <div className="relative w-full border-t border-gray-200 pt-3">
            <p className="text-[15px] font-extrabold uppercase leading-tight text-slate-900">
              {name}
            </p>
            <p className="text-[12px] font-semibold text-gray-600">
              Park Monitor · {area || "Anambra State"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
