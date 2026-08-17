/**
 * CR80 — the physical ID card standard.
 *
 * ISO/IEC 7810 ID-1: 85.60 mm x 53.98 mm, the same card as a bank card. The
 * Ministry's printer asked for artwork at exactly these dimensions, and was
 * explicit that the card must NOT be enlarged to fit bigger text — the layout
 * is rebalanced instead.
 *
 * Our cards were not CR80. The driver card was 320x560 px (ratio 0.5714) and
 * the park staff card 300x450 (0.6667), against a true portrait ratio of
 * 0.6306. The driver card was ~10% too narrow for its height, which is why
 * every font size had to be shrunk to fit and why the printed text kept
 * reading small.
 *
 * HOW THIS WORKS. The card is laid out at 408 x 647 px — exactly twice CR80
 * portrait at 96 CSS dpi — so there is comfortable room to design in. On
 * printing it is scaled by exactly 0.5, landing at 53.98 x 85.60 mm on paper.
 * The factor is exact, not approximate, so nothing drifts:
 *
 *   408 px x 0.5 = 204.02 px = 53.98 mm
 *   647 px x 0.5 = 323.46 px = 85.60 mm
 */

/** Physical card, portrait. */
export const CR80_MM = { width: 53.98, height: 85.6 } as const;

/** Physical card, landscape — the orientation the standard is quoted in. */
export const CR80_MM_LANDSCAPE = { width: 85.6, height: 53.98 } as const;

/** Design size in CSS pixels: exactly 2x CR80 portrait at 96 dpi. */
export const CARD_PX = { width: 408, height: 647 } as const;

/** Design px -> physical mm. Exactly one half. */
export const PRINT_SCALE = 0.5;

/** Pixel dimensions for supplying artwork to a printer at a given DPI. */
export function cr80Pixels(dpi = 300, orientation: "portrait" | "landscape" = "portrait") {
  const { width, height } =
    orientation === "portrait" ? CR80_MM : CR80_MM_LANDSCAPE;
  return {
    width: Math.round((width / 25.4) * dpi),
    height: Math.round((height / 25.4) * dpi),
  };
}

/**
 * Print rules for a page holding one or more CR80 cards.
 *
 * `zoom`, not `transform: scale()`. A transform is purely visual — the element
 * still occupies its full 408x647 px in layout, so the page overflowed and
 * every card printed across two sheets. `zoom` scales the layout box too, so
 * the card occupies exactly one CR80 page.
 *
 * The reset block collapses Next.js layout wrappers, which otherwise keep
 * their height and their dark background and print a black slab behind the
 * card.
 */
export function cr80PrintCss(sheetId: string, cardClass = "cr80-card"): string {
  return `
    @media print {
      @page {
        size: ${CR80_MM.width}mm ${CR80_MM.height}mm;
        margin: 0;
      }

      aside, header, nav, .no-print { display: none !important; }
      body * { visibility: hidden !important; }
      #${sheetId}, #${sheetId} * { visibility: visible !important; }

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
        width: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        gap: 0 !important;
        display: block !important;
        background: #fff !important;
      }

      .${cardClass}, #${sheetId} [data-face] {
        zoom: ${PRINT_SCALE};
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        break-after: page;
        page-break-after: always;
      }
      .${cardClass}:last-child, #${sheetId} [data-face]:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      * {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
    }
  `;
}
