import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { cr80PrintCss } from "@/lib/card-spec";

/**
 * Park staff ID card — CR80 (ISO/IEC 7810 ID-1), 53.98 x 85.60 mm portrait.
 *
 * Laid out at 408 x 647 px, exactly twice CR80 at 96 dpi, and scaled by 0.5
 * when printing so it lands at true physical size. The card was previously
 * 300 x 450 px, a ratio of 0.667 against CR80's 0.6306 — too wide for its
 * height, so it would never have cut correctly from a card printer.
 *
 * The QR and the security code both appear: the code is what an officer reads
 * aloud, the QR is what a phone scans. The same code is what goes on the
 * reflective vest.
 */
export default async function StaffIdCardPage({
  params,
}: {
  params: Promise<{ id: string; staffId: string }>;
}) {
  const { id, staffId } = await params;

  const staff = await db.parkStaff.findUnique({
    where: { id: staffId },
    include: { motorPark: { select: { businessName: true, lga: true, townCity: true } } },
  });

  if (!staff || staff.motorParkId !== id) notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const verifyUrl = `${base}/verify/park-staff/${staff.id}`;
  // Falls back to a generated code if the stored QR image is missing, so the
  // card is never printed without a scannable mark.
  const qrSrc =
    staff.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 print:m-0 print:max-w-none print:gap-0 print:bg-white print:p-0">
      <style dangerouslySetInnerHTML={{ __html: cr80PrintCss("staff-id-sheet") }} />

      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/motor-parks/${id}/staff`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to park staff
        </Link>
        <PrintButton />
      </div>

      <p className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground print:hidden">
        Card prints at CR80 — 53.98 × 85.60 mm, the same size as a bank card.
        Print at 100% scale; do not &ldquo;fit to page&rdquo;.
      </p>

      <div id="staff-id-sheet" className="flex justify-center">
        <div
          className="cr80-card relative flex h-[647px] w-[408px] flex-col overflow-hidden rounded-2xl border-2 border-primary bg-white text-black shadow-xl print:shadow-none"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
          {/* Header */}
          <div className="relative bg-primary px-4 py-3 text-center text-primary-foreground">
            <h2 className="text-[17px] font-extrabold uppercase leading-tight">
              Ministry of Transport
            </h2>
            <p className="text-[13px] font-semibold uppercase opacity-90">
              Anambra State
            </p>
            <span className="absolute right-2 top-2.5 rounded bg-emerald-500 px-1.5 py-0.5 text-[11px] font-extrabold uppercase text-white shadow-xs">
              {staff.status}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center px-5 pt-5">
            <div className="mb-3 h-[220px] w-[186px] overflow-hidden rounded-xl border-[3px] border-primary bg-gray-100">
              {staff.photoUrl ? (
                <Image
                  width={186}
                  height={220}
                  quality={100}
                  priority
                  src={staff.photoUrl}
                  className="h-full w-full object-cover"
                  alt={staff.name}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-gray-400">
                  No photograph
                </div>
              )}
            </div>

            <h3 className="text-center text-[21px] font-extrabold uppercase leading-tight">
              {staff.name}
            </h3>
            <p className="mt-1 text-center text-[15px] font-extrabold uppercase tracking-wider text-primary">
              {staff.role}
            </p>

            <div className="mt-3 w-full rounded-lg bg-gray-100 px-3 py-2 text-center">
              <p className="text-[11px] font-extrabold uppercase text-gray-500">
                Motor Park
              </p>
              <p className="line-clamp-2 text-[14px] font-bold leading-snug">
                {staff.motorPark.businessName}
              </p>
            </div>

            {/* Security code and QR — the two ways this person is verified. */}
            <div className="mb-4 mt-auto flex w-full items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase leading-none text-gray-500">
                  Security Code
                </p>
                <p className="mt-1 break-all font-mono text-[15px] font-extrabold text-slate-900">
                  {staff.securityCode}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase text-gray-500">
                  Staff No. {String(staff.parkSerialNumber).padStart(3, "0")}
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
      </div>
    </div>
  );
}
