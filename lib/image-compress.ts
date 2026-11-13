/**
 * Client-side photo compression.
 *
 * A phone camera produces a 3-8 MB photograph; an ID card shows it at roughly
 * 170 x 200 px. Uploading the original wastes the applicant's data and the
 * Ministry's storage for no visible benefit, so every photograph is resized and
 * re-encoded in the browser BEFORE it is uploaded — whether it was just taken
 * with the camera or picked from the gallery.
 *
 * Browser-only (uses canvas / createImageBitmap).
 */

export interface CompressOptions {
  /** Longest edge in px. 800 is ~4x the printed ID photo, so nothing is lost. */
  maxDimension?: number;
  /** Target ceiling for the output, in bytes. */
  maxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
}

export interface CompressResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 800,
  maxBytes: 150 * 1024,
  initialQuality: 0.85,
  minQuality: 0.5,
};

export class ImageDecodeError extends Error {
  constructor() {
    super(
      "This photo could not be read. Please use a JPEG, PNG or WEBP image, or retake the photo.",
    );
    this.name = "ImageDecodeError";
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // `from-image` applies the EXIF rotation, so a portrait phone photo is not
  // stored sideways.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to the <img> path */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageDecodeError());
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageDecodeError())),
      "image/jpeg",
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const opts = { ...DEFAULTS, ...options };

  if (!file.type.startsWith("image/")) throw new ImageDecodeError();

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new ImageDecodeError();
  }

  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!srcW || !srcH) throw new ImageDecodeError();

  let scale = Math.min(1, opts.maxDimension / Math.max(srcW, srcH));
  let best: Blob | null = null;

  // Lower the quality first; if even the floor is too heavy, shrink the image
  // and try again. Bounded, so a pathological file cannot spin forever.
  for (let pass = 0; pass < 4; pass++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageDecodeError();

    // JPEG has no alpha; paint white so a transparent PNG does not go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    for (
      let quality = opts.initialQuality;
      quality >= opts.minQuality - 0.001;
      quality -= 0.1
    ) {
      const blob = await toBlob(canvas, quality);
      best = blob;
      if (blob.size <= opts.maxBytes) break;
    }

    if (best && best.size <= opts.maxBytes) break;
    scale *= 0.8;
  }

  if ("close" in source) source.close();
  if (!best) throw new ImageDecodeError();

  // Never make a small, already-light photo bigger by re-encoding it — but only
  // keep the original when it is a format the server accepts (not HEIC etc.).
  const uploadable = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (uploadable && best.size >= file.size && file.size <= opts.maxBytes) {
    return { file, originalBytes: file.size, compressedBytes: file.size };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const out = new File([best], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
  return { file: out, originalBytes: file.size, compressedBytes: out.size };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
