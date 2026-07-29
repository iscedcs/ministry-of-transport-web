import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CheckCircle2, ShieldCheck, User, Bus, FileText, Calendar, MapPin, Hash, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function VerifyTracasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Lookup vehicle by id, authorityRef, regNo, fleetNo, or sticker URL/code
  const vehicle = await db.tracasVehicle.findFirst({
    where: {
      OR: [
        { id },
        { authorityRef: { equals: id, mode: "insensitive" } },
        { registrationNumber: { equals: id, mode: "insensitive" } },
        { fleetNumber: { equals: id, mode: "insensitive" } },
        { sticker: { stickerUrl: { equals: id, mode: "insensitive" } } },
        { sticker: { stickerCode: { equals: id, mode: "insensitive" } } },
      ],
    },
    include: {
      assignedDriver: true,
      sticker: true,
    },
  });

  if (!vehicle) notFound();

  const driver = vehicle.assignedDriver;

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 py-8 text-foreground selection:bg-primary/20">
      <div className="max-w-md w-full bg-[var(--bg-secondary)] text-foreground border border-border rounded-3xl shadow-2xl overflow-hidden relative backdrop-blur-xl">
        {/* Background Watermark */}
        <div className="absolute inset-0 top-24 flex items-center justify-center pointer-events-none z-0">
          <Image
            src="/anambra_mot_logo.png"
            alt=""
            width={340}
            height={340}
            className="opacity-[0.05] object-contain filter grayscale"
          />
        </div>

        {/* Premium Brand Header Banner */}
        <div className="bg-gradient-to-b from-[oklch(76%_0.24_80)] via-[oklch(70%_0.22_75)] to-[oklch(60%_0.20_70)] pt-9 pb-16 px-6 text-center text-slate-950 relative z-10 shadow-lg">
          <div className="w-16 h-16 bg-slate-950/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-slate-950/20">
            <CheckCircle2 className="w-10 h-10 text-slate-950" />
          </div>
          <Badge className="bg-slate-950/20 text-slate-950 hover:bg-slate-950/30 border-none font-bold text-[11px] tracking-widest uppercase mb-2">
            Verified TRACAS Authority
          </Badge>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {vehicle.registrationNumber}
          </h1>
          <p className="text-xs font-semibold text-slate-950/80 mt-1">
            Fleet No: {vehicle.fleetNumber} · TRACAS Managed
          </p>
        </div>

        {/* Floating Authority Reference Code Pill */}
        <div className="-mt-8 relative z-20 flex justify-center px-6">
          <div className="bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-gold)] shadow-2xl rounded-full px-5 py-2 flex items-center gap-2 text-xs font-mono font-bold tracking-wider">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Ref: {vehicle.authorityRef}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 pt-6 space-y-6 relative z-10">
          {/* Status Badge */}
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Permit Status</p>
                <p className="text-sm font-bold text-emerald-500">AUTHORIZED TO PLY ROUTE</p>
              </div>
            </div>
            <Bus className="w-5 h-5 text-emerald-500" />
          </div>

          {/* Assigned Driver Enumeration Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Assigned Driver
              </span>
              {driver?.photoUrl && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Enumerated
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="w-16 h-16 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                {driver?.photoUrl ? (
                  <img src={driver.photoUrl} alt={driver.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-foreground truncate">
                  {driver?.fullName || "No Driver Assigned"}
                </p>
                {driver?.phoneNumber && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" /> {driver.phoneNumber}
                  </p>
                )}
                {driver?.licenseNumber && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    License: <span className="font-semibold text-foreground">{driver.licenseNumber}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Particulars Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Vehicle Category
              </span>
              <p className="font-bold text-foreground">{vehicle.category}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Make / Model
              </span>
              <p className="font-bold text-foreground truncate">{vehicle.makeModel || "N/A"}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Engine Number
              </span>
              <p className="font-mono font-semibold text-foreground truncate">{vehicle.engineNumber || "N/A"}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Chassis / VIN
              </span>
              <p className="font-mono font-semibold text-foreground truncate">{vehicle.chassisNumber || "N/A"}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1 col-span-2">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Assigned Route
              </span>
              <p className="font-bold text-foreground">{vehicle.assignedRoute || "Statewide Operations"}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Insurance No.
              </span>
              <p className="font-mono font-semibold text-foreground truncate">{vehicle.insuranceCertificateNo || "N/A"}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                Insurance Expiry
              </span>
              <p className="font-semibold text-foreground">{formatDate(vehicle.insuranceExpiry)}</p>
            </div>
          </div>

          {/* Action Link to Official Letter */}
          <Link
            href={`/tracas/${vehicle.id}/letter`}
            className="w-full py-3.5 px-4 bg-[var(--brand-gold)] hover:bg-[var(--brand-gold-up)] text-[var(--text-inverse)] font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            View Official Letter of Authority
          </Link>

          {/* Footer Official Authority Notice */}
          <div className="pt-2 text-center border-t border-border/40 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              Anambra State Government · Ministry of Transport
            </p>
            <p>Transport Company of Anambra State (TRACAS)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
