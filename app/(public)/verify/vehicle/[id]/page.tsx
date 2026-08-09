/**
 * Public verification — mass transit fleet vehicle.
 *
 * Reached from the unified /verify search when a plate belongs to a licensed
 * transit operator rather than TRACAS. Shows authorisation status only:
 * engine number, chassis/VIN and any contact details are deliberately absent.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArrowLeft, Bus, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

export const metadata = {
  title: "Vehicle Verification — Ministry of Transport",
};

const fmt = (d: Date | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground mt-0.5 break-words">
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function VerifyTransitVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vehicle = await db.vehicle.findFirst({
    where: {
      OR: [{ id }, { registrationNumber: { equals: id, mode: "insensitive" } }],
    },
    select: {
      id: true,
      registrationNumber: true,
      vehicleType: true,
      make: true,
      model: true,
      status: true,
      routesServed: true,
      roadworthinessExpiry: true,
      company: {
        select: {
          companyName: true,
          permitNumber: true,
          permitStatus: true,
          permitExpiresAt: true,
          approvedColour: true,
        },
      },
    },
  });

  if (!vehicle) notFound();

  const licensed = vehicle.company?.permitStatus === "ACTIVE";
  const active = vehicle.status === "ACTIVE";
  const authorised = licensed && active;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          New search
        </Link>

        {/* Verdict */}
        <div
          className={`mt-6 rounded-3xl border p-6 text-center ${
            authorised
              ? "border-emerald-500/25 bg-emerald-500/10"
              : "border-red-500/25 bg-red-500/10"
          }`}>
          {authorised ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          ) : (
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
          )}
          <p
            className={`mt-3 text-xs font-bold uppercase tracking-widest ${
              authorised ? "text-emerald-400" : "text-red-400"
            }`}>
            {authorised ? "Authorised to operate" : "Not currently authorised"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {vehicle.registrationNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mass Transit · {vehicle.company?.companyName ?? "Unknown operator"}
          </p>
          {!authorised && (
            <p className="mt-3 text-xs text-muted-foreground max-w-sm mx-auto">
              {!licensed
                ? "The operating company does not hold a current permit."
                : `This vehicle is marked ${vehicle.status.toLowerCase()} on the register.`}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Bus className="w-4 h-4 text-muted-foreground" />
            Vehicle
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Fact label="Registration" value={vehicle.registrationNumber} />
            <Fact label="Type" value={vehicle.vehicleType} />
            <Fact
              label="Make & model"
              value={[vehicle.make, vehicle.model].filter(Boolean).join(" ")}
            />
            <Fact label="Status" value={vehicle.status} />
            <Fact
              label="Roadworthiness"
              value={fmt(vehicle.roadworthinessExpiry)}
            />
            {vehicle.routesServed && (
              <Fact label="Routes" value={vehicle.routesServed} />
            )}
          </dl>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            Operator
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Fact
              label="Company"
              value={vehicle.company?.companyName ?? "—"}
            />
            <Fact
              label="Permit number"
              value={vehicle.company?.permitNumber ?? "Not issued"}
            />
            <Fact
              label="Permit status"
              value={vehicle.company?.permitStatus ?? "—"}
            />
            <Fact
              label="Permit expires"
              value={fmt(vehicle.company?.permitExpiresAt ?? null)}
            />
            {vehicle.company?.approvedColour && (
              <Fact
                label="Approved livery"
                value={vehicle.company.approvedColour}
              />
            )}
          </dl>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          This service confirms registration and authorisation status only.
          Owner contact details, chassis and engine numbers are not published.
        </p>
      </div>
    </div>
  );
}
