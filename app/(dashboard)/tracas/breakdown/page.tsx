import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getTracasFleetBreakdown } from "@/app/actions/tracas-fleet-breakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/misc";
import { TracasNavTabs } from "@/components/tracas/tracas-nav-tabs";

export const metadata = {
  title: "TRACAS Fleet Breakdown — Ministry of Transport",
};

const n = (v: number) => v.toLocaleString("en-NG");
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${pct(value, max)}%` }}
      />
    </div>
  );
}

/**
 * The TRACAS fleet, broken down: how many FT and LV, and how many Sienna,
 * Shuttle, Bus, Minibus and Truck inside the whole fleet and inside each of FT
 * and LV. The page the "Total Fleet Vehicles" card on the TRACAS hub opens.
 */
export default async function TracasBreakdownPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await getTracasFleetBreakdown();
  if (!res.success) redirect("/unauthorized");
  const d = res.data;

  const ft = d.byFleetType.find((t) => t.type === "FT");
  const lv = d.byFleetType.find((t) => t.type === "LV");
  const other = d.byFleetType.find((t) => t.type === "OTHER");

  return (
    <div className="flex max-w-6xl flex-col gap-8">
      <TracasNavTabs role={session.role} />

      <div className="flex flex-col gap-3">
        <Link
          href="/tracas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Fleet &amp; Transport
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            TRACAS Fleet Breakdown
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every registered vehicle, split by fleet (FT or LV) and by kind of
            vehicle. Vehicles in the embargo pool are not registered, so they are
            not counted here.
          </p>
        </div>
      </div>

      {/* ── Headline ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total fleet" value={n(d.total)} delta="registered vehicles" />
        <StatCard
          label="FT — state fleet"
          value={n(ft?.total ?? 0)}
          delta={`${pct(ft?.total ?? 0, d.total)}% of fleet`}
        />
        <StatCard
          label="LV — private"
          value={n(lv?.total ?? 0)}
          delta={`${pct(lv?.total ?? 0, d.total)}% of fleet`}
        />
        <Link href="/tracas-embargo" className="block">
          <StatCard
            label="In embargo pool"
            value={n(d.embargoActive)}
            delta="not counted in the fleet"
            className="h-full hover:border-primary/50"
          />
        </Link>
      </div>

      {/* ── Kinds across the whole fleet ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          By kind of vehicle — whole fleet
        </h2>
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_5rem_5rem_5rem] gap-4 border-b bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Kind</span>
              <span>Share of fleet</span>
              <span className="text-right">Total</span>
              <span className="text-right">FT</span>
              <span className="text-right">LV</span>
            </div>
            <div className="divide-y divide-border">
              {d.byKind.map((k) => (
                <div
                  key={k.key}
                  className="grid items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_5rem_5rem_5rem]">
                  <span className="text-sm font-medium text-foreground">{k.label}</span>
                  <Bar
                    value={k.count}
                    max={d.total}
                    label={`${k.label}: ${k.count} of ${d.total} vehicles`}
                  />
                  <span className="text-right text-lg font-bold text-foreground md:text-sm md:font-semibold">
                    {n(k.count)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">
                    <span className="md:hidden">FT </span>
                    {n(k.ft)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">
                    <span className="md:hidden">LV </span>
                    {n(k.lv + k.other)}
                  </span>
                </div>
              ))}
              <div className="grid items-center gap-x-4 bg-muted/30 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_5rem_5rem_5rem]">
                <span className="text-sm font-semibold text-foreground">All vehicles</span>
                <span />
                <span className="text-right text-sm font-bold text-foreground">{n(d.total)}</span>
                <span className="text-right text-sm font-semibold text-foreground">{n(ft?.total ?? 0)}</span>
                <span className="text-right text-sm font-semibold text-foreground">
                  {n((lv?.total ?? 0) + (other?.total ?? 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        {other && other.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {n(other.total)} vehicle(s) have a fleet number that is neither FT nor
            LV; they are included in the LV column above.
          </p>
        )}
      </section>

      {/* ── Inside each fleet ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Inside each fleet
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {[ft, lv].map(
            (t) =>
              t && (
                <Card key={t.type} className="border-border shadow-sm">
                  <CardHeader className="flex-row items-baseline justify-between border-b bg-muted/20 pb-3">
                    <CardTitle className="text-base">{t.label}</CardTitle>
                    <span
                      className="text-2xl font-bold text-foreground"
                      style={{ fontFamily: "var(--font-display)" }}>
                      {n(t.total)}
                    </span>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 p-4">
                    {t.total === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No {t.type} vehicles registered yet.
                      </p>
                    ) : (
                      t.kinds.map((k) => (
                        <div key={k.key} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-foreground">{k.label}</span>
                            <span className="text-sm font-semibold text-foreground">
                              {n(k.count)}
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                {pct(k.count, t.total)}%
                              </span>
                            </span>
                          </div>
                          <Bar
                            value={k.count}
                            max={t.total}
                            label={`${t.type} ${k.label}: ${k.count} of ${t.total}`}
                          />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ),
          )}
        </div>
      </section>

      {/* ── What could not be placed ── */}
      {d.unclassified.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Other / unclassified
          </h2>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Older records carry whatever description was typed in. These could
                not be placed in a kind from the words used. Correct the vehicle&apos;s
                category on its record and it moves into the right group.
              </p>
              <ul className="flex flex-wrap gap-2">
                {d.unclassified.map((u) => (
                  <li
                    key={u.value}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground">
                    {u.value}{" "}
                    <span className="font-semibold text-muted-foreground">{u.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
