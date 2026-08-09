/**
 * Public verification — motor park.
 *
 * Gives parks a shareable verification link of their own, consistent with
 * vehicles, boats and drivers. Contact person, phone and email are omitted:
 * this confirms approval status, it is not a directory of park officials.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

export const metadata = {
  title: "Motor Park Verification — Ministry of Transport",
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

export default async function VerifyMotorParkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const park = await db.motorPark.findFirst({
    where: {
      OR: [{ id }, { anssidNumber: id }, { permitNumber: id }],
      applicationStatus: { in: ["APPROVED", "TEMPORAL_APPROVAL"] },
    },
    select: {
      id: true,
      businessName: true,
      transportCompanyName: true,
      streetAddress: true,
      townCity: true,
      lga: true,
      anssidNumber: true,
      permitNumber: true,
      permitStatus: true,
      applicationStatus: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      _count: { select: { parkStaff: true } },
    },
  });

  if (!park) notFound();

  const temporal = park.applicationStatus === "TEMPORAL_APPROVAL";
  const active = park.permitStatus === "ACTIVE" || !park.permitStatus;
  const approved = active || temporal;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          New search
        </Link>

        <div
          className={`mt-6 rounded-3xl border p-6 text-center ${
            approved
              ? temporal
                ? "border-amber-500/25 bg-amber-500/10"
                : "border-emerald-500/25 bg-emerald-500/10"
              : "border-red-500/25 bg-red-500/10"
          }`}>
          {approved ? (
            <CheckCircle2
              className={`w-10 h-10 mx-auto ${temporal ? "text-amber-400" : "text-emerald-400"}`}
            />
          ) : (
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
          )}
          <p
            className={`mt-3 text-xs font-bold uppercase tracking-widest ${
              approved
                ? temporal
                  ? "text-amber-400"
                  : "text-emerald-400"
                : "text-red-400"
            }`}>
            {temporal
              ? "Temporary approval"
              : approved
                ? "Approved motor park"
                : "Not currently approved"}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
            {park.businessName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {park.townCity}, {park.lga}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Park
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Fact label="Park name" value={park.businessName} />
            {park.transportCompanyName && (
              <Fact label="Operator" value={park.transportCompanyName} />
            )}
            <Fact label="Address" value={park.streetAddress} />
            <Fact label="Town" value={park.townCity} />
            <Fact label="LGA" value={park.lga} />
            <Fact label="ANSSID" value={park.anssidNumber} />
          </dl>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            Approval
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Fact
              label="Permit number"
              value={park.permitNumber ?? "Not issued"}
            />
            <Fact
              label="Status"
              value={temporal ? "Temporary" : (park.permitStatus ?? "Approved")}
            />
            <Fact label="Issued" value={fmt(park.permitIssuedAt)} />
            <Fact label="Expires" value={fmt(park.permitExpiresAt)} />
            <Fact
              label="Registered staff"
              value={`${park._count.parkStaff}`}
            />
          </dl>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Users className="w-3 h-3" />
          Park officials&apos; contact details are not published. For enquiries,
          contact the Ministry of Transport.
        </p>
      </div>
    </div>
  );
}
