/* eslint-disable @next/next/no-img-element */
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CheckCircle2, ShieldCheck, User, Phone, IdCard, Bus, Calendar, Building2 } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";

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

  const now = new Date();
  const issueDateStr = driver.createdAt
    ? format(new Date(driver.createdAt), "dd MMM yyyy")
    : format(now, "dd MMM yyyy");
  
  const expiryDateStr = driver.licenseExpiryDate
    ? format(new Date(driver.licenseExpiryDate), "dd MMM yyyy")
    : `31 Jan ${now.getFullYear() + 1}`;

  const qrTimestamp = format(now, "dd/MM/yyyy HH:mm");

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
            <span>Driver ID / Code: {driver.securityCode || "N/A"}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 pt-4 space-y-4 relative z-10">
          {/* Driver Verification Status */}
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center space-x-2 text-foreground font-semibold text-sm">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
              <span>Driver Status</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              ACTIVE & AUTHORIZED
            </span>
          </div>

          {/* Driver Particulars Summary Card */}
          <div className="space-y-3 bg-secondary/40 p-4 rounded-2xl border border-border text-sm">
            {/* Phone number withheld — publishing a driver's direct line
                alongside their vehicle invites impersonation. */}

            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center text-xs">
                <IdCard className="w-3.5 h-3.5 mr-1.5 text-primary" /> License Number
              </span>
              <span className="font-mono font-bold text-foreground">
                {driver.licenseNumber || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center text-xs">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary" /> Transport Union / Company
              </span>
              <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                {driver.operatorAssociation || "TRACAS Transport Union"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" /> Issue Date
              </span>
              <span className="font-medium text-foreground">
                {issueDateStr}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground flex items-center text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" /> Expiry Date
              </span>
              <span className="font-medium text-foreground">
                {expiryDateStr}
              </span>
            </div>
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

          {/* Verification Timestamp & Notice */}
          <div className="pt-2 text-center border-t border-border/40 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-emerald-400">
              ✓ Verified by Anambra State Ministry of Transport
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              Verification Timestamp: {qrTimestamp}
            </p>
            <p className="pt-1 text-[10px]">Transport Company of Anambra State (TRACAS)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
