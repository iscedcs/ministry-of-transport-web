/* eslint-disable @next/next/no-img-element */
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CheckCircle2, ShieldCheck, User, Phone, IdCard, Bus } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function VerifyTracasDriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const driver = await db.tracasDriver.findFirst({
    where: {
      OR: [
        { id },
        { securityCode: id },
        { licenseNumber: id },
      ],
    },
    include: {
      vehicles: {
        select: {
          id: true,
          registrationNumber: true,
          fleetNumber: true,
          category: true,
        },
      },
    },
  });

  if (!driver) notFound();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 py-8 text-foreground selection:bg-primary/20">
      <div className="max-w-md w-full bg-[var(--bg-secondary)] text-foreground border border-border rounded-3xl shadow-2xl overflow-hidden relative backdrop-blur-xl">
        {/* Watermark */}
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
            Verified Driver Profile
          </Badge>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {driver.fullName}
          </h1>
          <p className="text-xs font-semibold text-slate-950/80 mt-1">
            Commercial Driver · TRACAS Authorized
          </p>
        </div>

        {/* Floating Photo & Security Code */}
        <div className="-mt-14 relative z-20 flex flex-col items-center px-6">
          <div className="w-28 h-28 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-muted flex items-center justify-center">
            {driver.photoUrl ? (
              <img src={driver.photoUrl} alt={driver.fullName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <div className="mt-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-gold)] shadow-xl rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Sec Code: {driver.securityCode || "N/A"}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 pt-4 space-y-5 relative z-10">
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Driver Status</p>
                <p className="text-sm font-bold text-emerald-500">ACTIVE & AUTHORIZED</p>
              </div>
            </div>
            <IdCard className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone Number
              </span>
              <p className="font-bold text-foreground truncate">{driver.phoneNumber}</p>
            </div>

            <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                License Number
              </span>
              <p className="font-mono font-bold text-foreground truncate">{driver.licenseNumber || "N/A"}</p>
            </div>

            {driver.nin && (
              <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                  NIN
                </span>
                <p className="font-mono font-semibold text-foreground truncate">{driver.nin}</p>
              </div>
            )}

            {driver.stateOfOrigin && (
              <div className="bg-card border border-border/60 p-3 rounded-xl space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
                  State of Origin
                </span>
                <p className="font-semibold text-foreground truncate">{driver.stateOfOrigin}</p>
              </div>
            )}
          </div>

          {/* Assigned Vehicles Section */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5" /> Assigned Vehicles ({driver.vehicles.length})
            </span>

            {driver.vehicles.length > 0 ? (
              <div className="space-y-2">
                {driver.vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/50 text-xs">
                    <span className="font-bold text-foreground">{v.registrationNumber}</span>
                    <span className="font-mono text-muted-foreground">Fleet: {v.fleetNumber}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No active vehicle assigned.</p>
            )}
          </div>

          {/* Footer Official Notice */}
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
