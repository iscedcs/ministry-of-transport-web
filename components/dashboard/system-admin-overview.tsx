import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/misc";
import type { SystemAdminOverview } from "@/lib/system-admin-stats";

/**
 * System Admin dashboard body — platform-wide totals: vehicles by service,
 * stickers, operators, people, money, and what just happened.
 *
 * Server component: it renders numbers it is handed and ships no JavaScript.
 */

const n = (value: number) => value.toLocaleString("en-NG");

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

/** "VEHICLE_INSPECTION_OFFICER" -> "Vehicle inspection officer" */
function roleLabel(role: string) {
  const t = role.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

function relative(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A horizontal bar: `value` out of `max`, labelled with the plain number. */
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

function MiniStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {note && <span className="ml-2 text-xs text-muted-foreground">{note}</span>}
      </span>
    </div>
  );
}

export function SystemAdminOverviewView({ data }: { data: SystemAdminOverview }) {
  const { vehicles, stickers, operators, people, revenue, recentActivity } = data;
  const maxRole = Math.max(1, ...people.byRole.map((r) => r.count));

  return (
    <div className="flex flex-col gap-10">
      {/* ── Headline numbers ── */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Vehicles" value={n(vehicles.total)} delta="across all services" />
          <StatCard label="Stickers assigned" value={n(stickers.totalAssigned)} delta="vehicles + vessels" />
          <StatCard label="Users" value={n(people.totalUsers)} delta={`${n(people.activeUsers)} active`} />
          <StatCard label="Staff accounts" value={n(people.staff)} delta="Ministry & field" />
          <StatCard label="Drivers & riders" value={n(people.totalDrivers)} delta="all services" />
          <StatCard
            label="Revenue collected"
            value={naira(revenue.completedNaira)}
            delta={`${n(revenue.completedCount)} payments`}
          />
        </div>
      </section>

      {/* ── Vehicles by service ── */}
      <section className="flex flex-col gap-4">
        <SectionTitle hint="Counted per service registration — a vehicle on two services appears under each.">
          Vehicles by service
        </SectionTitle>
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {vehicles.byService.map((s) => (
                <div
                  key={s.key}
                  className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <Link
                      href={s.href}
                      className="text-sm font-semibold text-foreground hover:text-primary hover:underline">
                      {s.label}
                    </Link>
                    {s.breakdown.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {s.breakdown.map((b) => (
                          <span key={b.label} className="text-xs text-muted-foreground">
                            {b.label}{" "}
                            <span className="font-semibold text-foreground">{n(b.count)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Bar
                      value={s.withSticker}
                      max={s.vehicles}
                      label={`${s.label}: ${s.withSticker} of ${s.vehicles} vehicles have a sticker`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {n(s.withSticker)} with sticker · {n(s.vehicles - s.withSticker)} without
                      {s.vehicles > 0 && ` · ${pct(s.withSticker, s.vehicles)}% covered`}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className="text-2xl font-bold text-foreground"
                      style={{ fontFamily: "var(--font-display)" }}>
                      {n(s.vehicles)}
                    </span>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      vehicles
                    </p>
                  </div>
                </div>
              ))}

              <div className="grid gap-3 bg-muted/30 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center">
                <span className="text-sm font-semibold text-foreground">All services</span>
                <div className="flex flex-col gap-1.5">
                  <Bar
                    value={vehicles.withSticker}
                    max={vehicles.total}
                    label={`${vehicles.withSticker} of ${vehicles.total} vehicles have a sticker`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {n(vehicles.withSticker)} with sticker · {n(vehicles.withoutSticker)} without
                    {vehicles.total > 0 && ` · ${pct(vehicles.withSticker, vehicles.total)}% covered`}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}>
                    {n(vehicles.total)}
                  </span>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    total
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <Link
                href="/boats"
                className="text-sm font-semibold text-foreground hover:text-primary hover:underline">
                Maritime vessels
              </Link>
              <p className="text-xs text-muted-foreground">
                Boats are counted apart from the road-vehicle total.
              </p>
            </div>
            <div className="text-right text-sm">
              <span className="font-semibold text-foreground">{n(vehicles.vessels.total)}</span>{" "}
              <span className="text-muted-foreground">
                vessels · {n(vehicles.vessels.withSticker)} with sticker
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Stickers ── */}
      <section className="flex flex-col gap-4">
        <SectionTitle hint="Pooled stickers are imported ahead of time and bound to a vehicle later; other services record the scanned code on the vehicle.">
          Stickers
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Assigned to vehicles"
            value={n(vehicles.withSticker)}
            delta={`${pct(vehicles.withSticker, vehicles.total)}% of road vehicles`}
          />
          <StatCard
            label="Assigned to vessels"
            value={n(vehicles.vessels.withSticker)}
            delta={`${pct(vehicles.vessels.withSticker, vehicles.vessels.total)}% of vessels`}
          />
          <StatCard
            label="In stock, unassigned"
            value={n(stickers.poolAvailable)}
            delta="TRACAS + maritime pools"
          />
        </div>
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-base">Imported sticker pools</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {stickers.pools.map((p) => (
              <div key={p.label} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center">
                <span className="text-sm font-semibold text-foreground">{p.label}</span>
                <div className="flex flex-col gap-1.5">
                  <Bar
                    value={p.assigned}
                    max={p.imported}
                    label={`${p.label}: ${p.assigned} of ${p.imported} assigned`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {n(p.assigned)} assigned · {n(p.available)} available
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}>
                    {n(p.imported)}
                  </span>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    imported
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ── Operators & facilities ── */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Parks, transit &amp; revalidation</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Motor parks"
            value={n(operators.motorParks)}
            delta={`${n(operators.activeMotorParks)} with active permit`}
          />
          <StatCard label="Mass transit companies" value={n(operators.massTransitCompanies)} />
          <StatCard
            label="Revalidations"
            value={n(operators.revalidationApplications)}
            delta={`${n(operators.revalidationsNumbered)} numbered`}
          />
          <StatCard label="Logistics applicants" value={n(operators.logisticsApplicants)} />
          <StatCard label="Terminals" value={n(operators.terminals)} />
        </div>
      </section>

      {/* ── People ── */}
      <section className="flex flex-col gap-4">
        <SectionTitle>People</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/20 pb-3">
              <CardTitle className="text-base">User accounts by role</CardTitle>
              <Link href="/admin/users" className="text-xs font-medium text-primary hover:underline">
                Manage users
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4">
              {people.byRole.map((r) => (
                <div key={r.role} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground">{roleLabel(r.role)}</span>
                    <span className="text-sm font-semibold text-foreground">{n(r.count)}</span>
                  </div>
                  <Bar value={r.count} max={maxRole} label={`${roleLabel(r.role)}: ${r.count}`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-3">
                <CardTitle className="text-base">Accounts</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1">
                <MiniStat label="Total users" value={n(people.totalUsers)} />
                <MiniStat label="Active" value={n(people.activeUsers)} />
                <MiniStat label="Deactivated" value={n(people.deactivatedUsers)} />
                <MiniStat label="Signed in, last 30 days" value={n(people.loggedInLast30Days)} />
                <MiniStat label="Ministry & field staff" value={n(people.staff)} />
                <MiniStat label="Public applicants" value={n(people.applicants)} />
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-3">
                <CardTitle className="text-base">Field personnel</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1">
                <MiniStat
                  label="Park staff"
                  value={n(people.parkStaff)}
                  note={`${n(people.activeParkStaff)} active`}
                />
                <MiniStat
                  label="Special Enforcement Unit members"
                  value={n(people.enforcementApproved)}
                  note={`${n(people.enforcementPending)} awaiting review`}
                />
                <MiniStat label="Unit groups" value={n(people.enforcementGroups)} />
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-3">
                <CardTitle className="text-base">Drivers &amp; riders</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1">
                {people.drivers.map((d) => (
                  <MiniStat key={d.label} label={d.label} value={n(d.count)} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Money & activity ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionTitle>Payments</SectionTitle>
          <Card className="border-border shadow-sm">
            <CardContent className="px-4 py-1">
              <MiniStat label="Collected" value={naira(revenue.completedNaira)} />
              <MiniStat label="Completed payments" value={n(revenue.completedCount)} />
              <MiniStat label="Pending / processing" value={n(revenue.pendingCount)} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <SectionTitle>Recent activity</SectionTitle>
            <Link href="/admin/audit" className="text-xs font-medium text-primary hover:underline">
              Full audit log
            </Link>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="divide-y divide-border p-0">
              {recentActivity.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nothing recorded yet.
                </p>
              ) : (
                recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {a.description || roleLabel(a.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[a.actor, roleLabel(a.entityType)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relative(a.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
