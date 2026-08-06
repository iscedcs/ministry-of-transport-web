/**
 * One-off tooling — extract official signatures into transparent PNGs.
 *
 * The source images are phone photos of green-ink signatures on white paper,
 * complete with shadows and a grey cast. This isolates the ink, drops the
 * paper to full transparency, trims the empty border, and emits base64 PNGs
 * into lib/signatures.ts.
 *
 * Why base64 in a module rather than files in public/:
 *   1. public/ is world-readable — publishing two officials' signatures to the
 *      open internet is a forgery risk on a document with legal weight.
 *   2. Bundling as a module means no filesystem reads at runtime, which is
 *      what makes it work on serverless without output-file tracing config.
 *
 * The generated module is imported only by the authenticated letter route.
 *
 *   npx tsx extract-signatures.ts
 *
 * Requires the dev-only `sharp` dependency. Production never runs this.
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

interface Source {
  /** Key in the generated SIGNATURES map. */
  key: string;
  file: string;
  label: string;
}

const SOURCES: Source[] = [
  {
    key: "commissioner",
    file: "assets/signatures/commissioner-min-of-trasport-signature.jpeg",
    label: "Hon. Edward Obiefuna Ibuzo — Commissioner, Ministry of Transport",
  },
  {
    key: "tracasMd",
    file: "assets/signatures/md-of-tracas-signature.jpeg",
    label: "Okeke Njideka — Ag. MD/CEO, TRACAS",
  },
];

/**
 * Ink detection keys on GREEN DOMINANCE, not darkness.
 *
 * Thresholding by luminance alone also captures the printed "[DIGITAL
 * SIGNATURE]" placeholder text and the paper shadows present in the source
 * photos — both are dark. But both are also colour-neutral (r≈g≈b), whereas
 * the pen is distinctly green. Requiring the green channel to lead separates
 * the signature from everything else on the page in one test.
 */
const GREEN_MIN = 9; // minimum green lead over the r/b average to count as ink
const GREEN_STRONG = 42; // green lead at which a stroke is fully opaque
const LUMA_CEILING = 215; // reject blown-out highlights

async function extract(src: Source): Promise<string> {
  const abs = path.resolve(src.file);
  const input = sharp(abs).rotate(); // honour EXIF orientation

  const { data, info } = await input
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4, 0);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inkPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const greenLead = g - (r + b) / 2;

      if (greenLead < GREEN_MIN || luma > LUMA_CEILING) continue;

      // Opacity tracks how strongly green the pixel is, so stroke edges fade
      // smoothly instead of aliasing into a hard cut-out.
      const strength =
        (greenLead - GREEN_MIN) / (GREEN_STRONG - GREEN_MIN);
      const alpha = Math.max(
        0,
        Math.min(255, Math.round(70 + strength * 185)),
      );
      if (alpha < 24) continue;

      const o = (y * width + x) * 4;
      // Normalise to the letter's ink colour rather than keeping camera green.
      out[o] = 12;
      out[o + 1] = 48;
      out[o + 2] = 28;
      out[o + 3] = alpha;

      inkPixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (inkPixels === 0 || maxX < 0) {
    throw new Error(`No ink detected in ${src.file} — adjust the thresholds.`);
  }

  const pad = 6;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cropW = Math.min(width - left, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - top, maxY - minY + 1 + pad * 2);

  const png = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .resize({ width: 600, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  const pct = ((inkPixels / (width * height)) * 100).toFixed(1);
  console.log(
    `  ${src.key.padEnd(14)} ${width}x${height} -> ${cropW}x${cropH}` +
      `  ink ${pct}%  ${(png.length / 1024).toFixed(1)} KB`,
  );

  return `data:image/png;base64,${png.toString("base64")}`;
}

async function main() {
  console.log("\n  Extracting signatures...\n");

  const entries: string[] = [];
  for (const src of SOURCES) {
    const dataUri = await extract(src);
    entries.push(
      `  /** ${src.label} */\n  ${src.key}:\n    "${dataUri}",`,
    );
  }

  const generated = `/**
 * Official signature images — GENERATED FILE, do not edit by hand.
 *
 * Produced by extract-signatures.ts from the source photographs. Stored as
 * base64 data URIs rather than files under public/ so the images are never
 * fetchable by URL: publishing officials' signatures would be a forgery risk
 * on a document that carries legal weight.
 *
 * Import only into authenticated, server-rendered routes. Never expose these
 * on a public verification page.
 *
 * Regenerate with:  npx tsx extract-signatures.ts
 */

export const SIGNATURES = {
${entries.join("\n")}
} as const;

export type SignatureKey = keyof typeof SIGNATURES;
`;

  const outPath = path.resolve("lib/signatures.ts");
  await fs.writeFile(outPath, generated, "utf-8");
  console.log(`\n  Wrote ${outPath}\n`);

  console.log(
    "  Sources live in assets/ (not web-served); output is bundled, never fetchable.\n",
  );
}

main().catch((e) => {
  console.error("\n  FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
