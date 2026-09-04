/**
 * Enumerator Dashboard — landing page for the ENUMERATOR role.
 *
 * Enumerators onboard vehicles and drivers across every fleet module. This
 * gives them one place to see the register they are building and jump
 * straight into each onboarding flow.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEnumeratorDashboardStats } from "@/app/actions/enumerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTimeShort } from "@/lib/utils/format";

export const metadata = {
  title: "Enumeration Dashboard — Ministry of Transport",
};

const MODULES = [
  {
    href: "/commercial-vehicles",
    icon: "🚛",
    title: "Commercial Vehicles",
    description: "Onboard commercial vehicles, assign drivers, and manage registration.",
    statKeys: [
      { key: "cvrVehicles", label: "Vehicles" },
      { key: "cvrDrivers", label: "Drivers" },
    ],
  },
  {
    href: "/tracas",
    icon: "🚏",
    title: "TRACAS Fleet",
    description: "Onboard TRACAS vehicles and enumerate commercial drivers.",
    statKeys: [
      { key: "tracasVehicles", label: "Vehicles" },
      { key: "tracasDrivers", label: "Drivers" },
    ],
  },
  {
    href: "/boats",
    icon: "🚤",
    title: "Boats & Maritime",
    description: "Onboard boats and enumerate registered boat riders.",
    statKeys: [
      { key: "boats", label: "Boats" },
      { key: "boatRiders", label: "Riders" },
    ],
  },
  {
    href: "/fleet-operators",
    icon: "🚌",
    title: "Mass Transit",
    description: "Fleet vehicles declared by mass transit operators.",
    statKeys: [{ key: "massTransitVehicles", label: "Vehicles" }],
  },
  {
    href: "/motor-parks",
    icon: "🅿️",
    title: "Motor Parks",
    description: "Park staff records and park-level enumeration.",
    statKeys: [{ key: "parkStaff", label: "Park staff" }],
  },
] as const;

/**
 * Where a capture begins. The Enumerator picks the service, then fills the
 * ordinary application form in field-capture mode — no owner section, saved
 * as a draft that belongs to nobody until the Ministry names an owner.
 */
const SERVICES = [
  {
    href: "/commercial-vehicles/register",
    icon: "🚛",
    title: "Commercial Vehicle",
    description: "Register commercial vehicle, driver, and operational route.",
  },
  {
    href: "/motor-parks/apply",
    icon: "🅿️",
    title: "Motor park",
    description: "Capture a park at the site. Owner details added later.",
  },
  {
    href: "/fleet-operators/apply",
    icon: "🚌",
    title: "Mass transit operator",
    description: "Capture a company and its terminals.",
  },
] as const;

export default async function EnumeratorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await getEnumeratorDashboardStats();
  if (!res.success) redirect("/unauthorized");

  const stats = res.data;

  return (
    <div className="space-y-8 py-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Enumeration Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Onboard vehicles and drivers across every transport module.
        </p>
      </div>

      {/* Personal enumeration counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Enumerated by you
            </p>
            <h3 className="text-3xl font-bold text-foreground mt-1">
              {stats.myTotal}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              All time, across all modules
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Today
            </p>
            <h3 className="text-3xl font-bold text-primary mt-1">
              {stats.myToday}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Records added since midnight
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total register
            </p>
            <h3 className="text-3xl font-bold text-foreground mt-1">
              {stats.cvrVehicles +
                stats.cvrDrivers +
                stats.tracasVehicles +
                stats.tracasDrivers +
                stats.boats +
                stats.boatRiders +
                stats.massTransitVehicles +
                stats.parkStaff}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Every enumerated record on the platform
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Start a capture — pick the service, then fill the form */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Onboard a service
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((svc) => (
            <Link
              key={svc.href}
              href={svc.href}
              className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <span className="text-2xl leading-none">{svc.icon}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground transition-colors group-hover:text-primary">
                  {svc.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {svc.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          You are not the owner, so the owner&apos;s section is not shown. What
          you capture is saved as a draft and completed by the Ministry.
        </p>
      </div>

      {/* Module entry points */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Onboarding modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group block rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.description}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-3">
                    {m.statKeys.map((s) => (
                      <div key={s.key}>
                        <span className="text-lg font-bold text-foreground">
                          {stats[s.key as keyof typeof stats] as number}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-1.5">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Personal activity, read from the audit trail */}
      <Card className="bg-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Your recent enumerations</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nothing enumerated yet. Pick a module above to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {stats.recent.map((r) => (
                <li
                  key={r.id}
                  className="py-2.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      {r.description ?? r.action}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {r.entityType}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {fmtDateTimeShort(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
