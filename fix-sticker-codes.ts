/**
 * One-off data fix — TRACAS sticker codes stored as full URLs.
 *
 * The camera binding path wrote the scanned URL into `stickerCode` instead of
 * the extracted code (it only recognised "/v/tracas/" URLs, not the
 * transpaytms shapes on the physical stickers). The public verification page
 * looks vehicles up by stickerCode, so those stickers 404 when scanned.
 *
 * This rewrites the affected rows to the bare code, e.g.
 *   https://www.transpaytms.com/v/status/1725966430268 → status1725966430268
 *   https://transpaytms.com/v/status1772618635928      → status1772618635928
 *
 * `stickerUrl` is already correct and is left untouched.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   npx tsx fix-sticker-codes.ts            # show the plan, change nothing
 *   npx tsx fix-sticker-codes.ts --apply    # execute it
 */

import "dotenv/config";
import { db } from "./lib/db";
import { extractStickerCode, isUrlLikeCode } from "./lib/tracas-sticker";

const APPLY = process.argv.includes("--apply");

async function main() {
  const stickers = await db.tracasSticker.findMany({
    select: {
      id: true,
      stickerUrl: true,
      stickerCode: true,
      isAssigned: true,
      assignedVehicle: { select: { registrationNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const broken = stickers.filter((s) => isUrlLikeCode(s.stickerCode));

  console.log(
    `\n  ${stickers.length} sticker(s) total — ${broken.length} with a URL in stickerCode.`,
  );

  if (broken.length === 0) {
    console.log("  Nothing to fix.\n");
    return;
  }

  // Build the plan, deriving the code from the bad value itself (that is the
  // URL that was actually scanned). Cross-check against stickerUrl and flag
  // any disagreement rather than silently picking one.
  const plan: { id: string; from: string; to: string; vehicle: string }[] = [];
  const warnings: string[] = [];

  for (const s of broken) {
    const fromCode = s.stickerCode!.trim();
    const derived = extractStickerCode(fromCode);
    const fromUrl = extractStickerCode(s.stickerUrl);

    if (derived !== fromUrl) {
      warnings.push(
        `  ! ${s.id}: code-derived '${derived}' differs from url-derived '${fromUrl}' ` +
          `(stickerUrl: ${s.stickerUrl})`,
      );
    }

    if (!derived || derived === fromCode) {
      warnings.push(
        `  ! ${s.id}: could not reduce '${fromCode}' to a code — skipping.`,
      );
      continue;
    }

    plan.push({
      id: s.id,
      from: fromCode,
      to: derived,
      vehicle: s.assignedVehicle?.registrationNumber ?? "unassigned",
    });
  }

  // stickerCode is @unique — catch collisions before touching the database.
  const existingCodes = new Set(
    stickers
      .filter((s) => !isUrlLikeCode(s.stickerCode) && s.stickerCode)
      .map((s) => s.stickerCode!.toLowerCase()),
  );
  const seen = new Set<string>();
  const collisions: string[] = [];

  for (const p of plan) {
    const key = p.to.toLowerCase();
    if (existingCodes.has(key)) {
      collisions.push(`  ! '${p.to}' already exists on another sticker.`);
    }
    if (seen.has(key)) {
      collisions.push(`  ! '${p.to}' is produced by more than one row.`);
    }
    seen.add(key);
  }

  console.log("\n── PLANNED CHANGES ──────────────────────────────────────────");
  for (const p of plan) {
    console.log(`  ${p.vehicle.padEnd(14)} ${p.from}\n  ${"".padEnd(14)}   → ${p.to}\n`);
  }

  if (warnings.length > 0) {
    console.log("── WARNINGS ─────────────────────────────────────────────────");
    warnings.forEach((w) => console.log(w));
  }

  if (collisions.length > 0) {
    console.log("\n── COLLISIONS (must resolve first) ──────────────────────────");
    collisions.forEach((c) => console.log(c));
    console.log(
      "\n  stickerCode is UNIQUE — aborting. Resolve the duplicates above first.\n",
    );
    process.exit(1);
  }

  if (!APPLY) {
    console.log(
      `\n  DRY RUN — ${plan.length} row(s) would change. Re-run with --apply to execute.\n`,
    );
    return;
  }

  console.log(`\n  Applying ${plan.length} update(s)...`);
  await db.$transaction(
    plan.map((p) =>
      db.tracasSticker.update({
        where: { id: p.id },
        data: { stickerCode: p.to },
      }),
    ),
  );

  const remaining = (
    await db.tracasSticker.findMany({ select: { stickerCode: true } })
  ).filter((s) => isUrlLikeCode(s.stickerCode)).length;

  console.log(`  Done. ${remaining} sticker(s) still hold a URL in stickerCode.\n`);
}

main()
  .catch((e) => {
    console.error("\n  FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
