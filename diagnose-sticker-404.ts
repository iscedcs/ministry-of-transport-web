/**
 * Read-only diagnostic — why do some scanned TRACAS stickers 404?
 *
 * Replays the exact lookup used by app/(public)/v/tracas/[id]/page.tsx for
 * every sticker in the pool, against each id form the redirect might deliver:
 *
 *   - the stored stickerCode            e.g. status1772628090070
 *   - the digits-only tail              e.g. 1772628090070
 *   - the last path segment of the URL
 *
 * Reports which forms resolve to a vehicle and which 404, so the failing
 * stickers can be identified precisely instead of guessed at.
 *
 * WRITES NOTHING.
 *
 *   npx tsx diagnose-sticker-404.ts
 */

import "dotenv/config";
import { db } from "./lib/db";

/** The page's lookup, verbatim. */
async function resolves(id: string) {
  return db.tracasVehicle.findFirst({
    where: {
      OR: [
        { id },
        { authorityRef: { equals: id, mode: "insensitive" } },
        { registrationNumber: { equals: id, mode: "insensitive" } },
        { fleetNumber: { equals: id, mode: "insensitive" } },
        { sticker: { stickerUrl: { equals: id, mode: "insensitive" } } },
        { sticker: { stickerUrl: { contains: id, mode: "insensitive" } } },
        { sticker: { stickerCode: { equals: id, mode: "insensitive" } } },
      ],
    },
    select: { id: true, registrationNumber: true, fleetNumber: true },
  });
}

async function main() {
  const stickers = await db.tracasSticker.findMany({
    select: {
      id: true,
      stickerUrl: true,
      stickerCode: true,
      isAssigned: true,
      assignedVehicleId: true,
      assignedVehicle: { select: { registrationNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const failures: string[] = [];
  const mismatches: string[] = [];

  console.log(`\n  ${stickers.length} sticker(s).\n`);

  for (const s of stickers) {
    const code = (s.stickerCode ?? "").trim();
    const digits = code.replace(/\D/g, "");
    const lastSegment =
      s.stickerUrl.split("?")[0].split("/").filter(Boolean).pop() ?? "";

    const candidates = [...new Set([code, digits, lastSegment])].filter(Boolean);

    const bound = s.assignedVehicle?.registrationNumber ?? null;
    const header = `  ${(bound ?? "UNBOUND").padEnd(12)} ${code.padEnd(24)}`;

    const results: string[] = [];
    for (const c of candidates) {
      const hit = await resolves(c);
      if (!hit) {
        results.push(`404  /v/tracas/${c}`);
      } else {
        const flag = bound && hit.registrationNumber !== bound ? "  <-- WRONG VEHICLE" : "";
        results.push(`ok   /v/tracas/${c}  ->  ${hit.registrationNumber}${flag}`);
        if (bound && hit.registrationNumber !== bound) {
          mismatches.push(
            `  ${c} resolves to ${hit.registrationNumber} but the sticker is bound to ${bound}`,
          );
        }
      }
    }

    const anyOk = results.some((r) => r.startsWith("ok"));
    console.log(header + (anyOk ? "" : "  *** ALL FORMS 404 ***"));
    results.forEach((r) => console.log(`      ${r}`));

    if (!anyOk) {
      failures.push(
        `  ${code}  (url: ${s.stickerUrl})  bound=${bound ?? "no"} isAssigned=${s.isAssigned}`,
      );
    }
    console.log();
  }

  console.log("── SUMMARY ──────────────────────────────────────────────────");

  const unbound = stickers.filter((s) => !s.assignedVehicleId);
  console.log(
    `  ${stickers.length} stickers · ${stickers.length - unbound.length} bound · ${unbound.length} unbound`,
  );
  console.log(
    "  NOTE: the public page queries vehicles joined to a sticker, so an",
  );
  console.log(
    "  unbound sticker ALWAYS 404s regardless of its code — that is by design.",
  );

  if (failures.length > 0) {
    console.log(`\n  ${failures.length} sticker(s) where no id form resolves:`);
    failures.forEach((f) => console.log(f));
  }

  if (mismatches.length > 0) {
    console.log(
      `\n  ${mismatches.length} substring collision(s) — 'contains' matched the wrong vehicle:`,
    );
    mismatches.forEach((m) => console.log(m));
  }

  // Flag hosts that differ, since a redirect configured only on the apex
  // domain will not cover www. (or vice versa).
  const hosts = new Map<string, number>();
  for (const s of stickers) {
    try {
      const h = new URL(s.stickerUrl).host.toLowerCase();
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    } catch {
      hosts.set("(unparseable)", (hosts.get("(unparseable)") ?? 0) + 1);
    }
  }
  if (hosts.size > 1) {
    console.log("\n  Sticker URLs span multiple hosts — check the redirect covers all:");
    for (const [h, n] of hosts) console.log(`    ${h}  (${n})`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("\n  FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
