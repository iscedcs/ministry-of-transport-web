/**
 * TRACAS sticker code extraction.
 *
 * Physical stickers encode a verification URL. The pool importer and the
 * camera scanner both need to reduce that URL to the bare code stored in
 * `TracasSticker.stickerCode`, because the public verification page looks
 * vehicles up by that code. Previously each path did its own ad-hoc parsing
 * and the scanner missed the transpaytms URL shape entirely, writing the full
 * URL into the code column and producing 404s on scan.
 *
 * Shapes seen in the field:
 *   https://transpaytms.com/v/status1772618635928        → status1772618635928
 *   https://www.transpaytms.com/v/status/1725966430268   → status1725966430268
 *   https://mot.anambra.gov.ng/v/tracas/TRAC-58958-AN    → TRAC-58958-AN
 *   https://mot.anambra.gov.ng/verify/tracas/TRAC-123-AN → TRAC-123-AN
 *   status1772618635928                                  → unchanged
 */

/**
 * Reduce a scanned sticker value to its bare code.
 * Non-URL input is returned untouched — it is already a code.
 */
export function extractStickerCode(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return raw;

  // Already a bare code — nothing to strip.
  if (!/^https?:\/\//i.test(raw)) return raw;

  let pathname: string;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    // Malformed URL — fall back to chopping the origin off by hand.
    pathname = raw.replace(/^https?:\/\/[^/]+/i, "");
  }

  // Drop whichever verification route prefix the issuing host used.
  const withoutPrefix = pathname.replace(
    /^\/(?:v|verify)\/(?:tracas-driver\/|tracas\/)?/i,
    "",
  );

  // Join the remaining segments. transpaytms issues both `/v/status1772…`
  // and `/v/status/1725…`; collapsing the slashes normalises them to the
  // same `status<digits>` form.
  const code = withoutPrefix.split("/").filter(Boolean).join("");

  // If stripping left nothing usable, keep the original rather than lose it.
  return code || raw;
}

/** True when a stored stickerCode is actually a URL and needs repair. */
export function isUrlLikeCode(code: string | null | undefined): boolean {
  return !!code && /^https?:\/\//i.test(code.trim());
}
