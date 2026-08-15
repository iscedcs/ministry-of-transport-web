import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Copy every row from one database to another.
 *
 *   SOURCE_DATABASE_URL   defaults to DATABASE_URL — the database being read
 *   TARGET_DATABASE_URL   the database being written to
 *
 * Neither URL is ever printed; only the host is shown, so a connection string
 * cannot leak into a terminal log or a screenshot.
 *
 * BEFORE RUNNING, create the schema on the target:
 *
 *   DATABASE_URL="$TARGET_DATABASE_URL" npx prisma db push
 *
 * Then:
 *
 *   npx tsx scripts/migrate-to-live.ts              # dry run — counts only
 *   npx tsx scripts/migrate-to-live.ts --apply      # copy
 *   npx tsx scripts/migrate-to-live.ts --verify     # compare both sides
 *
 * The copy is IDEMPOTENT and RESUMABLE: rows are inserted with skipDuplicates,
 * so re-running after a failure fills only what is missing. It never deletes
 * anything, on either side.
 *
 * ORDERING. Tables must be written parent-first, or a foreign key points at a
 * row that does not exist yet. The order comes from the TARGET DATABASE's own
 * foreign-key catalogue — NOT from Prisma's DMMF, which in Prisma 7 no longer
 * reports `relationFromFields` and yields a silently empty graph.
 *
 * CYCLES. Some tables point at each other (Boat <-> BoatSticker,
 * TracasVehicle <-> TracasSticker / TracasDriver), so no ordering satisfies
 * every constraint. Such an edge is broken at a NULLABLE column: the row is
 * inserted with that column empty, and a second pass fills it in once both
 * sides exist.
 */

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const BATCH = 500;

const SOURCE = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

/** Host only — never the credentials. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable-url";
  }
}

function client(url: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
    log: ["error"],
  });
}

/** PascalCase model name -> the camelCase delegate on PrismaClient. */
const delegateOf = (model: string) =>
  model.charAt(0).toLowerCase() + model.slice(1);

const MODELS = Prisma.dmmf.datamodel.models;
const tableOf = (model: string) =>
  MODELS.find((m) => m.name === model)?.dbName ?? model;
const modelOfTable = (table: string) =>
  MODELS.find((m) => (m.dbName ?? m.name) === table)?.name;
const hasId = (model: string) =>
  MODELS.find((m) => m.name === model)?.fields.some((f) => f.name === "id") ??
  false;

/* eslint-disable @typescript-eslint/no-explicit-any */
const on = (c: PrismaClient, model: string) => (c as any)[delegateOf(model)];

interface Fk {
  child: string;
  parent: string;
  column: string;
  nullable: boolean;
}

async function existingTables(c: PrismaClient): Promise<Set<string>> {
  const rows = await c.$queryRaw<{ table_name: string }[]>`
    SELECT table_name::text AS table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'`;
  return new Set(rows.map((r) => r.table_name));
}

/** The real foreign-key graph, straight from the Postgres catalogue. */
async function foreignKeys(c: PrismaClient): Promise<Fk[]> {
  return c.$queryRaw<Fk[]>`
    SELECT
      cl.relname::text   AS child,
      pcl.relname::text  AS parent,
      att.attname::text  AS column,
      NOT att.attnotnull AS nullable
    FROM pg_constraint con
    JOIN pg_class cl       ON cl.oid = con.conrelid
    JOIN pg_class pcl      ON pcl.oid = con.confrelid
    JOIN pg_namespace ns   ON ns.oid = cl.relnamespace
    JOIN pg_attribute att  ON att.attrelid = con.conrelid
                          AND att.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND array_length(con.conkey, 1) = 1`;
}

/**
 * Parent-first ordering, with cyclic edges broken at a nullable column.
 * Returns the order plus the columns to fill in afterwards.
 */
function planOrder(fks: Fk[], tables: string[]) {
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t, new Set());
  for (const fk of fks) {
    if (fk.child === fk.parent) continue; // self-reference resolves in place
    if (!deps.has(fk.child) || !deps.has(fk.parent)) continue;
    deps.get(fk.child)!.add(fk.parent);
  }

  const deferred = new Map<string, Set<string>>();
  const order: string[] = [];
  const remaining = new Map([...deps].map(([k, v]) => [k, new Set(v)]));

  for (;;) {
    let progress = false;
    for (const [name, d] of [...remaining]) {
      if ([...d].every((x) => !remaining.has(x))) {
        order.push(name);
        remaining.delete(name);
        progress = true;
      }
    }
    if (remaining.size === 0) break;
    if (progress) continue;

    // Deadlock: everything left sits in a cycle. Break the first edge whose
    // column is nullable — that row can be inserted without it and patched
    // once the table it points at exists.
    const breakable = fks.find(
      (fk) =>
        fk.nullable &&
        remaining.has(fk.child) &&
        remaining.get(fk.child)!.has(fk.parent),
    );
    if (!breakable) {
      throw new Error(
        `Circular foreign keys with no nullable column to break: ${[...remaining.keys()].join(", ")}`,
      );
    }
    remaining.get(breakable.child)!.delete(breakable.parent);
    const set = deferred.get(breakable.child) ?? new Set<string>();
    set.add(breakable.column);
    deferred.set(breakable.child, set);
  }

  return { order, deferred };
}

async function main() {
  if (!SOURCE) throw new Error("SOURCE_DATABASE_URL (or DATABASE_URL) is not set.");
  if (!TARGET) throw new Error("TARGET_DATABASE_URL is not set.");
  if (SOURCE === TARGET) {
    throw new Error("Source and target are the same database — refusing to run.");
  }

  console.log(`\n  source : ${hostOf(SOURCE)}`);
  console.log(`  target : ${hostOf(TARGET)}`);
  console.log(
    `  mode   : ${APPLY ? "APPLY — writing" : VERIFY ? "VERIFY" : "DRY RUN — nothing written"}`,
  );

  const src = client(SOURCE);
  const dst = client(TARGET);

  try {
    const targetTables = await existingTables(dst);
    const absent = MODELS.map((m) => m.name).filter(
      (m) => !targetTables.has(tableOf(m)),
    );

    if (absent.length > 0) {
      console.log(`  tables : ${MODELS.length}\n`);
      console.log(`  ${absent.length} of ${MODELS.length} tables do not exist on the target.`);
      console.log("    The schema has not been created there yet. Run:");
      console.log('      DATABASE_URL="$TARGET_DATABASE_URL" npx prisma db push');
      console.log("    then run this again.");
      return;
    }

    const fks = await foreignKeys(dst);
    const { order: tableOrder, deferred } = planOrder(
      fks,
      MODELS.map((m) => tableOf(m.name)),
    );
    const order = tableOrder
      .map(modelOfTable)
      .filter((m): m is string => Boolean(m));

    console.log(`  tables : ${order.length}`);
    if (deferred.size > 0) {
      console.log(
        `  cycles : ${[...deferred]
          .map(([t, cols]) => `${t}.${[...cols].join("/")}`)
          .join(", ")} — filled in a second pass`,
      );
    }
    console.log("");

    // ── Dry run / verify ───────────────────────────────────────────────────
    if (!APPLY) {
      let srcTotal = 0;
      let dstTotal = 0;
      const rows: string[] = [];

      for (const model of order) {
        const s: number = await on(src, model).count();
        const t: number = await on(dst, model).count();
        srcTotal += s;
        dstTotal += t;
        if (s === 0 && t === 0) continue;
        const flag = t === s ? "  ok" : t < s ? "  MISSING ROWS" : "  extra on target";
        rows.push(
          `  ${model.padEnd(30)} ${String(s).padStart(6)} → ${String(t).padStart(6)}${flag}`,
        );
      }

      console.log("  TABLE                          source → target");
      console.log(rows.join("\n"));
      console.log(`\n  total rows: source ${srcTotal}, target ${dstTotal}`);

      if (!VERIFY) console.log("\n  Dry run. Re-run with --apply to copy.");
      else if (srcTotal === dstTotal)
        console.log("\n  OK — row counts match on every table.");
      else console.log(`\n  ${srcTotal - dstTotal} row(s) not yet on the target.`);
      return;
    }

    // ── Pass 1: insert ─────────────────────────────────────────────────────
    let copied = 0;
    let skipped = 0;
    const started = Date.now();

    for (const model of order) {
      const total: number = await on(src, model).count();
      if (total === 0) continue;

      const holdBack = deferred.get(tableOf(model));
      let done = 0;
      let inserted = 0;

      while (done < total) {
        const batch: Record<string, unknown>[] = await on(src, model).findMany({
          skip: done,
          take: BATCH,
          ...(hasId(model) ? { orderBy: { id: "asc" } } : {}),
        });
        if (batch.length === 0) break;

        // Cyclic columns are left empty here and filled in pass 2.
        const payload = holdBack
          ? batch.map((row) => {
              const copy = { ...row };
              for (const col of holdBack) copy[col] = null;
              return copy;
            })
          : batch;

        const res = await on(dst, model).createMany({
          data: payload,
          skipDuplicates: true,
        });

        inserted += res.count;
        done += batch.length;
      }

      copied += inserted;
      skipped += total - inserted;
      const note = inserted === total ? "" : `  (${total - inserted} already present)`;
      const held = holdBack ? `  [${[...holdBack].join(", ")} deferred]` : "";
      console.log(
        `  ${model.padEnd(30)} ${String(inserted).padStart(6)} / ${total}${note}${held}`,
      );
    }

    // ── Pass 2: restore the deferred references ────────────────────────────
    if (deferred.size > 0) {
      console.log("\n  restoring deferred references...");
      for (const [table, cols] of deferred) {
        const model = modelOfTable(table);
        if (!model) continue;
        if (!hasId(model)) {
          console.log(`  ${model.padEnd(30)} SKIPPED — no id column to match on`);
          continue;
        }

        const rows: Record<string, unknown>[] = await on(src, model).findMany({
          select: Object.fromEntries([
            ["id", true],
            ...[...cols].map((c) => [c, true]),
          ]),
        });

        let patched = 0;
        for (const row of rows) {
          const data: Record<string, unknown> = {};
          for (const c of cols) if (row[c] != null) data[c] = row[c];
          if (Object.keys(data).length === 0) continue;
          await on(dst, model).update({ where: { id: row.id }, data });
          patched++;
        }
        console.log(
          `  ${model.padEnd(30)} ${String(patched).padStart(6)} reference(s) restored`,
        );
      }
    }

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `\n  copied ${copied} row(s), skipped ${skipped} already present, in ${secs}s`,
    );
    console.log("  Run with --verify to confirm the two sides match.");
  } finally {
    await src.$disconnect();
    await dst.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n  FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
