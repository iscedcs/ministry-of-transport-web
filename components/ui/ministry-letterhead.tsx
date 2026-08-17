/**
 * The Ministry's pre-printed letterhead, as one definition.
 *
 * Reproduced in markup rather than dropped in as the supplied photograph,
 * which is ~78 DPI and prints soft: rounded green frame with the heading
 * sitting ON the top border, the gold Ministry line, the reference block on
 * the left, the coat of arms in the centre, and the secretariat address and
 * date on the right.
 *
 * This was built inline in the TRACAS letter of authority. Every other
 * Ministry document then drifted — the motor park certificate had its own
 * black-bordered design with a fake typed signature. Extracting it means a
 * change to the letterhead reaches every letter at once.
 */

const MINISTRY_EMAIL = "mot@anambrastate.gov.ng";

const fmtDate = (d: Date | string | null | undefined) =>
  (d ? new Date(d) : new Date()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/**
 * The rounded frame and the heading that straddles it. Rendered as an overlay
 * so it traces the page edge without disturbing content flow — the parent must
 * be `relative`.
 */
export function LetterheadFrame() {
  return (
    <div
      data-lp="frame"
      className="pointer-events-none absolute inset-3 rounded-[2.25rem] border-[1.5px] sm:inset-5"
      style={{ borderColor: "#1f5138" }}>
      {/* Sits ON the top border, breaking the line either side exactly as the
          printed sheet does. */}
      <h1
        data-lp="lh-title"
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-white px-3 text-center text-[14px] font-bold uppercase leading-none tracking-tight text-slate-900 sm:text-[18px]"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        Government of Anambra State of Nigeria
      </h1>
    </div>
  );
}

/** The Ministry line, references, crest, address and date. */
export function LetterheadHeader({
  ourRef,
  date,
}: {
  /** Printed against "Our Ref". */
  ourRef?: string | null;
  date?: Date | string | null;
}) {
  return (
    <div data-lp="letterhead" className="relative">
      <h2
        data-lp="lh-subtitle"
        className="mt-1 text-center text-[12px] font-bold uppercase tracking-wide sm:text-[15px]"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#8a6d1f",
        }}>
        Ministry of Transport
      </h2>

      <div
        data-lp="lh-fields"
        className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-3 px-2">
        <div
          className="space-y-1.5 text-[10px] text-slate-700 sm:text-[11px]"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          <p>
            <span>E-mail:</span>{" "}
            <span className="text-slate-900">{MINISTRY_EMAIL}</span>
          </p>
          <p>
            <span>Tel:</span>
          </p>
          <p className="flex items-baseline gap-1">
            <span className="whitespace-nowrap">Your Ref:</span>
            <span className="flex-1 border-b border-dotted border-slate-400" />
          </p>
          <p className="flex items-baseline gap-1">
            <span className="whitespace-nowrap">Our Ref:</span>
            {ourRef ? (
              <span className="font-mono font-bold text-slate-900">{ourRef}</span>
            ) : null}
            <span className="flex-1 border-b border-dotted border-slate-400" />
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-lp="lh-crest"
          src="/letter-head/coat-of-arms.png"
          alt="Coat of Arms of the Federal Republic of Nigeria"
          className="mt-0.5 h-[74px] w-[74px] object-contain"
        />

        <div
          className="justify-self-end text-left text-[10px] leading-snug text-slate-700 sm:text-[11px]"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          <p>Chief Jerome Udoji Secretariat</p>
          <p>Complex</p>
          <p>Awka</p>
          <p className="mt-3">
            <span>Date:</span>{" "}
            <span className="font-semibold text-slate-900">{fmtDate(date)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The dark green strip that closes the pre-printed sheet. Sits flush to the
 * bottom edge inside the frame.
 */
export function LetterheadFooter() {
  return (
    <div
      data-lp="footer"
      className="-mx-8 -mb-8 mt-6 rounded-b-[2rem] px-4 py-2.5 text-center text-[11px] font-bold italic tracking-wide text-white sm:-mx-12 sm:-mb-12"
      style={{ backgroundColor: "#1f5138" }}>
      All replies to be addressed to the Hon. Commissioner
    </div>
  );
}

/**
 * Print rules for a letter on this letterhead.
 *
 * The reset block is the important part. Next.js wraps every page in layout
 * containers that keep their height and their dark background even when their
 * contents are hidden — which printed a black slab below the letter and
 * spilled onto a second page. Every ancestor is collapsed and forced white,
 * exactly as the TRACAS letter does.
 */
export function letterheadPrintCss(sheetId: string): string {
  return `
    @media print {
      @page { size: A4 portrait; margin: 8mm; }

      aside, header, nav, .no-print { display: none !important; }
      body * { visibility: hidden !important; }
      #${sheetId}, #${sheetId} * { visibility: visible !important; }

      /* Hidden-but-present ancestors still occupy space and still paint their
         background, so each one is collapsed and whitened. */
      html, body, body > div, main,
      div:has(> #${sheetId}),
      div:has(#${sheetId}) {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }

      #${sheetId} {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        max-width: none !important;
        /* A4 less the 8mm margins, less a safety gutter so rounding can never
           tip the letter onto a second page. */
        min-height: 265mm !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        margin: 0 !important;
        padding: 26px 20px 0 20px !important;
        border: none !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        font-size: 10pt !important;
        line-height: 1.28 !important;
      }

      #${sheetId} [data-lp="frame"] { inset: 10px !important; }

      /* The footer is pulled outward with negative margins to meet the screen
         padding; in print the padding differs, so it is squared off instead. */
      #${sheetId} [data-lp="footer"] {
        margin: 0 -20px 0 -20px !important;
        border-radius: 0 !important;
      }

      * {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
    }
  `;
}
