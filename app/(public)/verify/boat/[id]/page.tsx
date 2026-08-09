import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { Anchor, CheckCircle2, Info, ShieldCheck, User } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import ShareRideButton from "./share-ride-button";

export default async function VerifyBoatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch boat by ID or securityCode or registrationNumber or sticker URL/code
  const boat = await db.boat.findFirst({
    where: {
      OR: [
        { id },
        { securityCode: { equals: id, mode: "insensitive" } },
        { registrationNumber: { equals: id, mode: "insensitive" } },
        { sticker: { stickerUrl: { equals: id, mode: "insensitive" } } },
        { sticker: { stickerCode: { equals: id, mode: "insensitive" } } },
      ],
    },
    include: {
      assignedRider: true,
      sticker: true,
    },
  });

  if (!boat) notFound();

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/boat/${boat.id}`;

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
            Verified Maritime Transport
          </Badge>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950"
            style={{ fontFamily: "var(--font-display)" }}>
            {boat.name}
          </h1>
          <p className="text-xs text-slate-950/80 font-medium mt-1">
            Ministry of Transport • Anambra State Government
          </p>
        </div>

        {/* Content Card Body */}
        <div className="px-6 pb-6 pt-0 flex flex-col items-center relative z-10">
          {/* Security Badge Pill Floating */}
          <div className="-mt-7 z-20 bg-[var(--bg-elevated)] text-foreground px-6 py-2.5 rounded-full shadow-2xl border border-[var(--border-gold)] flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm font-bold tracking-wider text-primary">
              {boat.securityCode}
            </span>
          </div>

          <div className="w-full space-y-4 mt-6">
            {/* Status Indicator */}
            <div className="flex items-center justify-between p-3.5 bg-secondary/80 rounded-xl border border-border">
              <div className="flex items-center space-x-2 text-foreground font-semibold text-sm">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
                <span>Verification Status</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                {boat.status}
              </span>
            </div>

            {/* Vessel Specifications */}
            <div className="space-y-3 bg-secondary/40 p-4 rounded-2xl border border-border text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                <span className="text-muted-foreground flex items-center text-xs">
                  <Anchor className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                  Registration No.
                </span>
                <span className="font-mono font-bold text-foreground">
                  {boat.registrationNumber}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                <span className="text-muted-foreground flex items-center text-xs">
                  <Info className="w-3.5 h-3.5 mr-1.5 text-primary" /> Vessel
                  Category
                </span>
                <span className="font-medium text-foreground">
                  {boat.boatType}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground flex items-center text-xs">
                  <User className="w-3.5 h-3.5 mr-1.5 text-primary" /> Passenger
                  Capacity
                </span>
                <span className="font-medium text-foreground">
                  {boat.capacity || 10} Persons
                </span>
              </div>
            </div>

            {/* Assigned Rider Information */}
            <div className="p-4 bg-secondary/40 rounded-2xl border border-border">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5" /> Licensed Boat Operator /
                Driver
              </div>

              {boat.assignedRider ? (
                <div className="flex items-center space-x-3 mt-1">
                  <div className="w-11 h-11 bg-primary text-[var(--text-inverse)] rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                    {boat.assignedRider.fullName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">
                      {boat.assignedRider.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {/* Licence number and phone withheld — a public scan
                          confirms the operator is licensed, it does not
                          publish their identity documents. */}
                      {boat.assignedRider.licenseNumber && (
                        <span>Licence held</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-400 italic mt-1">
                  No assigned operator recorded for this vessel.
                </p>
              )}
            </div>

            {/* QR Sticker Verification Tag */}
            {boat.sticker && (
              <div className="text-center text-xs text-muted-foreground font-mono">
                Sticker ID: {boat.sticker.stickerCode || boat.sticker.id}
              </div>
            )}

            {/* Share Ride Safety Button */}
            <ShareRideButton
              boatName={boat.name}
              registrationNumber={boat.registrationNumber}
              securityCode={boat.securityCode}
              riderName={boat.assignedRider?.fullName || "Official Operator"}
              riderPhone={boat.assignedRider?.phoneNumber || "N/A"}
              verificationUrl={publicUrl}
            />

            <div className="text-center pt-2">
              <p className="text-[11px] text-muted-foreground">
                Official Verification Portal • State Government of Anambra
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
