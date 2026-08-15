import "dotenv/config";
import { db } from "../lib/db";
import { uploadDocument } from "../lib/spaces";

/**
 * Move TRACAS driver photographs out of the database and into object storage.
 *
 * Driver photos are captured in the browser with FileReader.readAsDataURL and
 * the resulting base64 string is written straight into TracasDriver.photoUrl.
 * The result: 133 rows holding 198 MB, one of them 4.4 MB on its own. That is
 * 90% of the entire database, it is re-read on every /tracas load, and it is
 * what pushed Neon past its threshold.
 *
 * This decodes each data URI, uploads it to Spaces exactly as every other
 * document already is, and replaces the column with the URL — roughly 100
 * characters instead of 1.5 million.
 *
 *   npx tsx scripts/migrate-driver-photos.ts            # dry run
 *   npx tsx scripts/migrate-driver-photos.ts --apply    # migrate
 *
 * SAFE TO RE-RUN. Rows already holding a URL are skipped, so an interrupted
 * run resumes where it stopped. A row is only updated AFTER its upload has
 * succeeded — a failed upload leaves the base64 untouched rather than losing
 * the photograph.
 */

const APPLY = process.argv.includes("--apply");
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** "data:image/jpeg;base64,/9j/4AA..." → { mime, buffer } */
function parseDataUri(value: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(value);
  if (!m) return null;
  try {
    return { mime: m[1].toLowerCase(), buffer: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

const mb = (n: number) => (n / 1048576).toFixed(1);

async function main() {
  const drivers = await db.tracasDriver.findMany({
    where: { photoUrl: { startsWith: "data:" } },
    select: { id: true, fullName: true, photoUrl: true },
  });

  const bytes = drivers.reduce((n, d) => n + (d.photoUrl?.length ?? 0), 0);
  console.log(
    `\n  ${APPLY ? "APPLYING" : "DRY RUN"} — ${drivers.length} driver photo(s), ${mb(bytes)} MB in the database\n`,
  );

  if (drivers.length === 0) {
    console.log("  Nothing to migrate — every photo is already a URL.");
    return;
  }

  let migrated = 0;
  let reclaimed = 0;
  let failed = 0;
  const unsupported: string[] = [];

  for (const d of drivers) {
    const parsed = parseDataUri(d.photoUrl!);
    const size = d.photoUrl!.length;

    if (!parsed) {
      failed++;
      console.log(`  SKIP    ${d.fullName} — photoUrl is not a readable data URI`);
      continue;
    }
    if (!MIME_EXT[parsed.mime]) {
      unsupported.push(`${d.fullName} (${parsed.mime})`);
      continue;
    }

    if (!APPLY) {
      console.log(
        `  would  ${d.fullName.padEnd(34)} ${parsed.mime.padEnd(11)} ${mb(size).padStart(5)} MB`,
      );
      reclaimed += size;
      migrated++;
      continue;
    }

    try {
      const file = new File([new Uint8Array(parsed.buffer)], `${d.id}${MIME_EXT[parsed.mime]}`, {
        type: parsed.mime,
      });
      const { url } = await uploadDocument(file, "tracas-driver-photos");

      // Only now is the base64 replaced — if the upload throws, the photo is
      // still in the row and the next run retries it.
      await db.tracasDriver.update({
        where: { id: d.id },
        data: { photoUrl: url },
      });

      migrated++;
      reclaimed += size;
      console.log(`  ok     ${d.fullName.padEnd(34)} ${mb(size).padStart(5)} MB -> ${url.slice(-28)}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL   ${d.fullName} — ${(err as Error).message}`);
    }
  }

  if (unsupported.length) {
    console.log(`\n  ${unsupported.length} photo(s) in an unsupported format, left as they are:`);
    for (const u of unsupported.slice(0, 10)) console.log(`     ${u}`);
  }

  console.log(
    `\n  ${APPLY ? "migrated" : "would migrate"} ${migrated}, failed ${failed}, ${mb(reclaimed)} MB reclaimed`,
  );

  if (APPLY && migrated > 0) {
    // Postgres does not return the space until the dead rows are cleaned up.
    console.log("\n  reclaiming disk space (VACUUM FULL)...");
    await db.$executeRawUnsafe(`VACUUM FULL "TracasDriver"`);
    const after = await db.$queryRaw<{ size: string }[]>`
      SELECT pg_size_pretty(pg_total_relation_size('"TracasDriver"')) AS size`;
    console.log(`  TracasDriver is now ${after[0].size}`);
  } else if (!APPLY) {
    console.log("\n  Dry run — nothing written. Re-run with --apply.");
  }
}

main().catch((e) => {
  console.error("\n  FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
