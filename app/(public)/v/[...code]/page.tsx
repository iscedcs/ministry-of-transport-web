import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { resolveSticker } from "@/lib/sticker-registry";

export const metadata = {
  title: "Sticker Verification — Ministry of Transport",
};

/**
 * Global sticker entry point — every QR scan lands here, whatever service the
 * sticker is attached to.
 *
 * transpaytms forwards all /v/* scans to this app. The scanned value is looked
 * up across every registered sticker source (lib/sticker-registry.ts), then
 * either redirected to that service's own verification page or rendered
 * below. Two-segment paths like /v/tracas/<id> match their own, more specific
 * route and never reach this one.
 *
 * Catch-all so that /v/status<id> and /v/status/<id> both arrive.
 */
export default async function StickerScanPage({
  params,
}: {
  params: Promise<{ code: string[] }>;
}) {
  const { code } = await params;
  const scanned = code.map((s) => decodeURIComponent(s)).join("");

  const hit = await resolveSticker(scanned);

  if (!hit) {
    // Not in any sticker table. Hand over to the TRACAS page, which also
    // resolves plate, fleet number and authority ref, and 404s on its own.
    redirect(`/v/tracas/${encodeURIComponent(scanned)}`);
  }

  if ("redirectTo" in hit) redirect(hit.redirectTo);

  const { summary } = hit;
  const Icon = summary.authorised ? CheckCircle2 : ShieldAlert;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {summary.service} · Ministry of Transport
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold">{summary.title}</h1>

          <div
            className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
              summary.authorised
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
            <Icon className="h-5 w-5 shrink-0" />
            {summary.statusLabel}
          </div>

          <dl className="mt-5 space-y-3">
            {summary.facts
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium break-words">{f.value}</dd>
                </div>
              ))}
          </dl>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Official Verification Portal • State Government of Anambra
        </p>
      </div>
    </div>
  );
}
