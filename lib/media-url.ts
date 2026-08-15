/**
 * Guard against images being stored in the database.
 *
 * TRACAS driver photographs were captured with FileReader.readAsDataURL and
 * written straight into TracasDriver.photoUrl. 133 rows came to 198 MB — 90%
 * of the whole database — and made /tracas take two minutes to open.
 *
 * The client no longer does that, but "the client no longer does that" is not
 * a guarantee: a new form, a copied component or a direct action call could
 * reinstate it silently, and nobody would notice until the database was large
 * again. So the rule is enforced where the write happens.
 *
 * Photographs belong in object storage (lib/spaces.ts). The database stores
 * the URL.
 */

/** Roughly 8 KB — far longer than any real URL, far shorter than any image. */
const MAX_URL_LENGTH = 8192;

export class EmbeddedMediaError extends Error {
  constructor(field: string) {
    super(
      `${field} received an embedded image instead of a URL. Upload the file via /api/upload and store the returned URL — images must not be written to the database.`,
    );
    this.name = "EmbeddedMediaError";
  }
}

/**
 * Returns the value unchanged when it is a storable reference, and throws when
 * it is an embedded image.
 *
 * Accepts: a normal URL, a relative path, null, undefined, or an empty string
 * (photographs are optional on several forms).
 */
export function assertStoredUrl<T extends string | null | undefined>(
  value: T,
  field: string,
): T {
  if (value == null || value === "") return value;

  const v = String(value).trim();
  if (v.startsWith("data:") || v.length > MAX_URL_LENGTH) {
    throw new EmbeddedMediaError(field);
  }
  return value;
}

/**
 * The non-throwing form, for actions that return an ActionResult rather than
 * raising. Returns an error message, or null when the value is fine.
 */
export function checkStoredUrl(
  value: string | null | undefined,
  field: string,
): string | null {
  try {
    assertStoredUrl(value, field);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
