import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";

/**
 * Reflective vest artwork — the QR and security code on their own.
 *
 * The ID card carries the same QR, but the vest is printed by a garment
 * printer from separate artwork: black on a plain ground, no card furniture,
 * sized to be read across a park rather than held in the hand.
 *
 * Deliberately not the ID card at a different scale. Everything here is what
 * survives being screen-printed: solid black marks, no photograph, no colour.
 */
export default async function VestQrPage({
  params,
}: {
  params: Promise<{ id: string; staffId: string }>;
}) {
  const { id, staffId } = await params;

  const staff = await db.parkStaff.findUnique({
    where: { id: staffId },
    include: { motorPark: { select: { businessName: true } } },
  });

  if (!staff || staff.motorParkId !== id) notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const verifyUrl = `${base}/verify/park-staff/${staff.id}`;

  // Requested large and with high error correction: a vest creases, and the
  // code must still scan when the fabric is not flat.
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&ecc=H&margin=0&data=${encodeURIComponent(
    verifyUrl,
  )}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 print:m-0 print:max-w-none print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              aside, header, nav, .no-print { display: none !important; }
              body * { visibility: hidden !important; }
              #vest-artwork, #vest-artwork * { visibility: visible !important; }
              html, body, body > div, main,
              div:has(> #vest-artwork), div:has(#vest-artwork) {
                height: auto !important; min-height: 0 !important;
                overflow: visible !important;
                margin: 0 !important; padding: 0 !important;
                background: #fff !important;
              }
              #vest-artwork {
                position: absolute !important;
                top: 0 !important; left: 0 !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
              }
              * {
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/motor-parks/${id}/staff`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to park staff
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={qr}
            target="_blank"
            rel="noopener noreferrer"
            download={`vest-qr-${staff.securityCode.replace(/[^\w]/g, "-")}.png`}
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary">
            Download QR
          </a>
          <PrintButton />
        </div>
      </div>

      <p className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground print:hidden">
        Artwork for the reflective vest. Give this to the garment printer, or
        download the QR on its own. It is printed in solid black — no colour, no
        photograph — so it survives screen printing and stays readable at a
        distance.
      </p>

      {/* The artwork itself */}
      <div
        id="vest-artwork"
        className="mx-auto flex w-full max-w-[520px] flex-col items-center rounded-2xl border bg-white px-8 py-10 text-black">
        <p className="text-[42px] font-black leading-none tracking-tight">
          M.O.T
        </p>
        <p className="mt-1 text-[15px] font-black uppercase tracking-wide">
          Approved Park Marshal
        </p>

        <p className="mt-4 font-mono text-[26px] font-black tracking-tight">
          {staff.securityCode}
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={`Verification QR for ${staff.name}`}
          className="mt-5 h-[220px] w-[220px]"
        />
        <p className="mt-2 text-[13px] font-bold">Scan to verify Personnel</p>

        <div className="mt-6 w-full border-t pt-3 text-center">
          <p className="text-[13px] font-bold uppercase">{staff.name}</p>
          <p className="text-[11px] text-neutral-600">
            {staff.role} · {staff.motorPark.businessName}
          </p>
        </div>
      </div>
    </div>
  );
}
