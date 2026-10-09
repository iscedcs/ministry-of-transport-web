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
 *
 * Two faces, printed on separate sheets (see cr80PrintCss's [data-face]
 * handling) — the reverse carries the state seal, the Ministry's official
 * "approved personnel" stamp, the security code and QR again, and the
 * surrender/return notice, matching the sample card the Ministry supplied.
 */
export default async function StaffIdCardPage({
  params,
}: {
  params: Promise<{ id: string; staffId: string }>;
}) {
  const { id, staffId } = await params;

  const staff = await db.parkStaff.findUnique({
    where: { id: staffId },
    include: {
      motorPark: { select: { businessName: true, lga: true, townCity: true } },
    },
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 print:m-0 print:max-w-none print:gap-0 print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{ __html: cr80PrintCss("staff-id-sheet") }}
      />

      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/motor-parks/${id}/staff`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to park staff
        </Link>
        <div className="flex items-center gap-2">
          {/* The vest is printed from separate artwork by a garment printer. */}
          <Link
            href={`/motor-parks/${id}/staff/${staff.id}/vest-qr`}
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary">
            Vest QR artwork
          </Link>
          <PrintButton />
        </div>
      </div>

      <p className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground print:hidden">
        Card prints at CR80 — 53.98 × 85.60 mm, the same size as a bank card.
        Print at 100% scale; do not &ldquo;fit to page&rdquo;.
      </p>

      <div
        id="staff-id-sheet"
        className="flex flex-row items-start justify-center gap-8">
        {/* ══════════════════ FRONT ══════════════════ */}
        <div
          data-face="front"
          className="cr80-card relative flex h-[647px] w-[408px] flex-col overflow-hidden rounded-2xl border-2 border-primary bg-white text-black shadow-xl print:shadow-none"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          {/* Seal */}
          <div className="flex justify-center bg-white pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/anambra_mot_logo.png"
              alt="Government of Anambra State"
              className="h-[72px] w-[72px]"
            />
          </div>

          {/* Header */}
          <div className="relative bg-primary px-4 py-2 mt-4 text-center text-primary-foreground">
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

          <div className="flex flex-1 flex-col items-center px-5 pt-3">
            <div className="mb-2 h-[196px] w-[166px] overflow-hidden rounded-xl border-[3px] border-primary bg-gray-100">
              {staff.photoUrl ? (
                <Image
                  width={166}
                  height={196}
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

        {/* ══════════════════ BACK ══════════════════ */}
        <div
          data-face="back"
          className="cr80-card relative flex h-[647px] w-[408px] flex-col items-center overflow-hidden rounded-2xl border-2 border-primary bg-white px-5 pb-5 pt-6 text-center text-black shadow-xl print:shadow-none"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}>
          {/* Seal watermark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/anambra_mot_logo.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[230px] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
          />

          <p className="text-[15px] font-semibold leading-snug text-gray-700">
            This Identity Card is the property of
            <br />
            Anambra State Government.
          </p>
          <p className="mt-3 text-[15px] font-semibold leading-snug text-gray-700">
            If misplaced, kindly return it to
            <br />
            Ministry of Transport Office
          </p>

          <div className="relative mt-6 flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-[25px] font-extrabold uppercase tracking-wide ">
              M.O.T
            </p>
            <p className="text-[19px] font-extrabold uppercase leading-tight text-primary">
              Approved Park Marshal
            </p>

            <p className="mt-2 font-mono text-[15px] font-extrabold text-slate-900">
              {staff.securityCode}
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
              {staff.name}
            </p>
            <p className="text-[12px] font-semibold text-gray-600">
              {staff.role} · {staff.motorPark.businessName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
