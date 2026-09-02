"use client";

import { PrintButton } from "@/components/ui/print-button";

/**
 * PARK REVALIDATION CERTIFICATE — the ornate landscape document.
 *
 * Distinct from the letter in components/revalidation/revalidation-certificate.tsx:
 * the LETTER conveys the decision and the fee; this CERTIFICATE is the artefact
 * the park displays. Both issue from the same approval, the letter first.
 *
 * Laid out against public/certificates/mot-revalidation-certificate.png. The
 * corner ribbons are drawn as SVG rather than rotated divs — the div version
 * rendered as thin slivers and could not reproduce the way the gold band
 * follows the green one around the corner. SVG also prints crisply at any
 * scale, which rotated boxes with border-radius do not.
 */

export interface ParkCertificateData {
  id: string;
  /** ANS-MOT-REV-YYYY/##### or ANS-MOT-TMP-YYYY/##### */
  certificateNumber: string | null;
  /** ANS-MOT-PK-###### */
  parkId: string | null;
  parkName: string;
  ownerName: string;
  /**
   * Only for a government-owned (public) park: the officer who runs it.
   * "Owned by the Anambra State Government" says nothing about who is
   * answerable on the ground, which is what an inspector needs to see.
   */
  managerName?: string | null;
  location: string | null;
  /** "Motor Park" | "Loading Bay" | a mass transit terminal designation */
  parkType: string | null;
  category: string | null;
  /** "TEMPORAL" | "PERMANENT" */
  approvalType: string | null;
  issuedAt: Date | string | null;
  validUntil: Date | string | null;
  validityMonths: number;
  commissionerName?: string | null;
}

const GREEN = "#0d3b2a";
const GREEN_MID = "#14543a";
const GOLD = "#b08d3f";
const GOLD_LIGHT = "#d9b769";

const fmt = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

/** 6 -> "6 MONTHS", 12 -> "1 YEAR" */
function periodLabel(months: number): string {
  if (months <= 0) return "—";
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y} YEAR${y === 1 ? "" : "S"}`;
  }
  return `${months} MONTH${months === 1 ? "" : "S"}`;
}

/* ── Icons ──────────────────────────────────────────────────────────────────
   Inline SVG rather than emoji: emoji render differently per platform and
   printed as flat glyphs of the wrong weight against the green discs. */

const ICON: Record<string, React.ReactNode> = {
  building: (
    <path d="M3 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M12 21V9a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v12M6 8h3M6 12h3M6 16h3M15 12h3M15 16h3M2 21h20" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  badge: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 3v3h6V3M8 11h8M8 15h5" />
    </>
  ),
  bus: (
    <>
      <rect x="3" y="5" width="18" height="11" rx="2" />
      <path d="M3 11h18M7 20v-2M17 20v-2" />
      <circle cx="7.5" cy="17.5" r="1.4" />
      <circle cx="16.5" cy="17.5" r="1.4" />
    </>
  ),
  tag: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3 20a6 6 0 0 1 12 0M15.5 20a5 5 0 0 1 5.5-4.9" />
    </>
  ),
  cert: (
    <>
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M8 8h8M8 12h5M9 21l3-2 3 2v-4H9z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6l8-3Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
};

function Disc({ name }: { name: keyof typeof ICON }) {
  return (
    <span
      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: GREEN }}
      aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px]"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round">
        {ICON[name]}
      </svg>
    </span>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof ICON;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200/90 py-[9px]">
      <Disc name={icon} />
      <span
        className="w-[150px] shrink-0 pt-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em]"
        style={{ color: GREEN }}>
        {label}
      </span>
      <span className="shrink-0 pt-[3px] text-[11px] font-bold text-slate-400">
        :
      </span>
      <span className="flex-1 pt-[2px] text-[12px] font-bold uppercase leading-snug text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof ICON;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 px-3">
      <Disc name={icon} />
      <div className="min-w-0">
        <p
          className="text-[8.5px] font-bold uppercase tracking-wide"
          style={{ color: GREEN }}>
          {label}
        </p>
        <p className="truncate text-[10.5px] font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

/** The green-and-gold sweeps at opposite corners. */
function CornerRibbons() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 707"
      preserveAspectRatio="none"
      aria-hidden>
      {/* Top-left: gold beneath, green over it. */}
      <path d="M0 0 H300 C170 78 78 190 34 330 L0 330 Z" fill={GOLD} />
      <path d="M0 0 H236 C132 68 62 168 26 286 L0 286 Z" fill={GREEN} />
      <path
        d="M0 352 C64 196 152 92 300 0"
        fill="none"
        stroke={GOLD_LIGHT}
        strokeWidth="3"
      />

      {/* Bottom-right: the same band, rotated about the centre. */}
      <path
        d="M1000 707 H700 C830 629 922 517 966 377 L1000 377 Z"
        fill={GOLD}
      />
      <path
        d="M1000 707 H764 C868 639 938 539 974 421 L1000 421 Z"
        fill={GREEN}
      />
      <path
        d="M1000 355 C936 511 848 615 700 707"
        fill="none"
        stroke={GOLD_LIGHT}
        strokeWidth="3"
      />
    </svg>
  );
}

export function ParkRevalidationCertificate({
  data,
  signature,
  verifyUrl,
  showActions = true,
}: {
  data: ParkCertificateData;
  /** Base64 image, injected by the authenticated server route. */
  signature?: string;
  verifyUrl: string;
  showActions?: boolean;
}) {
  const isTemporal = data.approvalType === "TEMPORAL";
  const issued = Boolean(data.certificateNumber);
  const accent = isTemporal ? GOLD : GREEN;

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    verifyUrl,
  )}`;

  return (
    <>
      {showActions && (
        <div className="mb-4 flex w-full max-w-[297mm] items-center justify-end gap-2 print:hidden">
          <PrintButton />
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          #park-certificate-sheet, #park-certificate-sheet * {
            visibility: visible !important;
          }
          #park-certificate-sheet {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 297mm !important; height: 209mm !important;
            box-shadow: none !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        id="park-certificate-sheet"
        className="relative mx-auto w-full max-w-[297mm] overflow-hidden bg-white shadow-xl"
        style={{ aspectRatio: "297 / 210", printColorAdjust: "exact" }}>
        <CornerRibbons />

        {/* Hairline gold frame, inside the ribbons. */}
        <div
          className="pointer-events-none absolute inset-[15px] border"
          style={{ borderColor: `${GOLD}66` }}
        />

        {!issued && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="rotate-[-24deg] whitespace-nowrap rounded-2xl border-[6px] border-red-600/15 px-10 py-3 text-[58px] font-black uppercase tracking-widest text-red-600/15">
              Draft — Not Valid
            </span>
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col px-[7%] pb-[2.6%] pt-[2.2%]">
          {/* Crest and Ministry */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/anambra_mot_logo.png"
              alt="Coat of Arms"
              className="h-[70px] w-[70px] object-contain"
            />
            <h2
              className="mt-0.5 text-[16px] font-extrabold uppercase tracking-wide"
              style={{
                color: GREEN,
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>
              Ministry of Transport
            </h2>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: GREEN_MID }}>
              Anambra State
            </p>

            {/* Ornamental divider */}
            <div className="mt-1.5 flex w-[46%] items-center gap-2">
              <span className="h-px flex-1" style={{ backgroundColor: GOLD }} />
              <svg viewBox="0 0 24 8" className="h-[7px] w-[26px]" aria-hidden>
                <path
                  d="M0 4h7M17 4h7M12 1l3 3-3 3-3-3 3-3Z"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.2"
                />
              </svg>
              <span className="h-px flex-1" style={{ backgroundColor: GOLD }} />
            </div>

            <h1
              className="mt-1 text-[31px] font-black uppercase leading-[1.05] tracking-tight"
              style={{
                color: GREEN,
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>
              Park Revalidation
            </h1>
            <h1
              className="text-[31px] font-black uppercase leading-[1.05] tracking-tight"
              style={{
                color: GOLD,
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>
              Certificate
            </h1>

            <div className="mt-1 flex w-[30%] items-center gap-2">
              <span
                className="h-px flex-1"
                style={{ backgroundColor: `${GOLD}88` }}
              />
              <span className="text-[7px]" style={{ color: GOLD }}>
                ◆
              </span>
              <span
                className="h-px flex-1"
                style={{ backgroundColor: `${GOLD}88` }}
              />
            </div>
          </div>

          {/* Particulars and status */}
          <div className="mt-3 flex flex-1 items-start gap-5">
            <div className="flex-1">
              <Row icon="building" label="Park Name" value={data.parkName} />
              <Row
                icon="user"
                label="Owned / Operated By"
                value={data.ownerName}
              />
              {data.managerName && (
                <Row
                  icon="user"
                  label="Park Manager"
                  value={data.managerName}
                />
              )}
              <Row icon="pin" label="Location" value={data.location ?? "—"} />
              <Row icon="badge" label="Park ID" value={data.parkId ?? "—"} />
              <Row
                icon="bus"
                label="Type of Park"
                value={data.parkType ?? "—"}
              />
              <Row icon="tag" label="Category" value={data.category ?? "—"} />
            </div>

            {/* Hugs its content — the panel previously ran the full column
                height and left a large empty box under the wording. */}
            <div
              className="w-[25%] self-start overflow-hidden rounded-[3px] border-2"
              style={{ borderColor: GREEN }}>
              <div
                className="py-[5px] text-center text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: GREEN }}>
                Approval Status
              </div>
              <div className="flex flex-col items-center px-3 pb-3 pt-2.5">
                <span
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[24px] w-[24px]"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    {ICON.shield}
                    {isTemporal ? (
                      <path d="M12 8v4M12 15.2v.1" />
                    ) : (
                      <path d="M8.6 12.2l2.3 2.3 4.5-4.6" />
                    )}
                  </svg>
                </span>
                <p
                  className="mt-1.5 text-center text-[17px] font-black uppercase leading-[1.06]"
                  style={{ color: accent }}>
                  {isTemporal ? (
                    <>
                      Temporary
                      <br />
                      Approval
                    </>
                  ) : (
                    <>
                      Full
                      <br />
                      Approval
                    </>
                  )}
                </p>
                <p className="mt-1.5 text-center text-[8.5px] leading-[1.35] text-slate-700">
                  {isTemporal ? (
                    <>
                      This park is granted{" "}
                      <span className="font-bold">TEMPORARY APPROVAL</span> to
                      continue operations while outstanding requirements are
                      met.
                    </>
                  ) : (
                    <>
                      This park has met all requirements and is granted{" "}
                      <span className="font-bold">FULL APPROVAL</span> to
                      continue operations.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Issue details */}
          <div
            className="mt-2 flex items-center rounded-[4px] border py-[7px]"
            style={{ borderColor: `${GOLD}77` }}>
            <Fact
              icon="cert"
              label="Certificate No."
              value={data.certificateNumber ?? "—"}
            />
            <span className="h-8 w-px bg-slate-200" />
            <Fact
              icon="calendar"
              label="Date of Revalidation"
              value={fmt(data.issuedAt)}
            />
            <span className="h-8 w-px bg-slate-200" />
            <Fact
              icon="shield"
              label="Valid Until"
              value={fmt(data.validUntil)}
            />
            <span className="h-8 w-px bg-slate-200" />
            <Fact
              icon="clock"
              label="Revalidation Period"
              value={periodLabel(data.validityMonths)}
            />
          </div>

          {/* Signature and verification */}
          <div className="mt-1.5 flex items-end justify-between px-3">
            <div className="flex w-[42%] flex-col items-center">
              {signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature}
                  alt="Commissioner's signature"
                  className="h-[42px] object-contain"
                />
              ) : (
                <div className="h-[42px]" />
              )}
              <span
                className="w-full border-t pt-1 text-center text-[9.5px] font-bold uppercase leading-tight"
                style={{ borderColor: GREEN, color: GREEN }}>
                {data.commissionerName ? (
                  <>
                    {data.commissionerName}
                    <br />
                  </>
                ) : null}

                <p className=" text-sm">Honourable Commissioner</p>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Scan to verify"
                className="h-[66px] w-[66px] border p-[3px]"
                style={{ borderColor: `${GOLD}77` }}
              />
              <div className="text-[8.5px] leading-[1.35] text-white">
                <p className="text-[10px] font-bold uppercase">
                  Scan to Verify
                </p>
                <p>Verify Park Status,</p>
                <p>Park ID and Certificate</p>
                <p>Validity Online.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
