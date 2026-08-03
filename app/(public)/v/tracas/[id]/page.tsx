/* eslint-disable @next/next/no-img-element */
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import {
  Bus,
  CheckCircle2,
  Info,
  ShieldCheck,
  User,
  MapPin,
  Car,
  FileText,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import ShareRideButton from "./share-ride-button";

export default async function PublicTracasStickerViewPage({
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
        { sticker: { stickerUrl: { contains: id, mode: "insensitive" } } },
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
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://mot.anambra.gov.ng";
  const publicUrl = `${baseUrl}/v/tracas/${encodeURIComponent(vehicle.registrationNumber || vehicle.id)}`;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return null;
    }
  };

  const formattedInsuranceExpiry = formatDate(vehicle.insuranceExpiry);

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
            style={{ fontFamily: "var(--font-display)" }}>
            {vehicle.registrationNumber}
          </h1>
          <p className="text-xs font-semibold text-slate-950/80 mt-1">
            Fleet No: {vehicle.fleetNumber} · TRACAS Managed
          </p>
        </div>

        {/* Content Card Body */}
        <div className="px-6 pb-6 pt-0 flex flex-col items-center relative z-10">
          {/* Security / Authority Ref Badge Pill Floating */}
          <div className="-mt-7 z-20 bg-[var(--bg-elevated)] text-foreground px-6 py-2.5 rounded-full shadow-2xl border border-[var(--border-gold)] flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm font-bold tracking-wider text-primary">
              {vehicle.authorityRef}
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
                {vehicle.status}
              </span>
            </div>

            {/* Vehicle Specifications */}
            <div className="space-y-3 bg-secondary/40 p-4 rounded-2xl border border-border text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                <span className="text-muted-foreground flex items-center text-xs">
                  <Bus className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                  Registration No.
                </span>
                <span className="font-mono font-bold text-foreground">
                  {vehicle.registrationNumber}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                <span className="text-muted-foreground flex items-center text-xs">
                  <Info className="w-3.5 h-3.5 mr-1.5 text-primary" /> Vehicle
                  Category
                </span>
                <span className="font-medium text-foreground">
                  {vehicle.category}
                </span>
              </div>

              {vehicle.makeModel && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <Car className="w-3.5 h-3.5 mr-1.5 text-primary" /> Make /
                    Model
                  </span>
                  <span className="font-medium text-foreground">
                    {vehicle.makeModel}
                  </span>
                </div>
              )}

              {vehicle.assignedRoute && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                    Assigned Route
                  </span>
                  <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                    {vehicle.assignedRoute}
                  </span>
                </div>
              )}

              {vehicle.engineNumber && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                    Engine Number
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {vehicle.engineNumber}
                  </span>
                </div>
              )}

              {vehicle.chassisNumber && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                    Chassis / VIN
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {vehicle.chassisNumber}
                  </span>
                </div>
              )}

              {vehicle.insuranceCertificateNo && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                    Insurance No.
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {vehicle.insuranceCertificateNo}
                  </span>
                </div>
              )}

              {formattedInsuranceExpiry && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground flex items-center text-xs">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" />{" "}
                    Insurance Expiry
                  </span>
                  <span className="font-medium text-foreground">
                    {formattedInsuranceExpiry}
                  </span>
                </div>
              )}
            </div>

            {/* Assigned Commercial Driver Information */}
            <div className="p-4 bg-secondary/40 rounded-2xl border border-border">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5" /> Licensed Commercial
                Driver
              </div>

              {driver ? (
                <div className="flex items-center space-x-3 mt-1">
                  <div className="w-11 h-11 bg-primary text-[var(--text-inverse)] rounded-full flex items-center justify-center font-bold text-lg shadow-md overflow-hidden flex-shrink-0">
                    {driver.photoUrl ? (
                      <img
                        src={driver.photoUrl}
                        alt={driver.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      driver.fullName[0]
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground truncate">
                      {driver.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {driver.licenseNumber && (
                        <span>
                          License:{" "}
                          <span className="font-mono text-foreground">
                            {driver.licenseNumber}
                          </span>{" "}
                          •{" "}
                        </span>
                      )}
                      {driver.securityCode && (
                        <span>
                          Security Code:{" "}
                          <span className="font-mono font-bold text-primary">
                            {driver.securityCode}
                          </span>{" "}
                          •{" "}
                        </span>
                      )}
                      {/* <span>{driver.phoneNumber}</span> */}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-400 italic mt-1">
                  No assigned driver recorded for this vehicle.
                </p>
              )}
            </div>

            {/* QR Sticker Verification Tag */}
            {vehicle.sticker && (
              <div className="text-center text-xs text-muted-foreground font-mono">
                Sticker ID: {vehicle.sticker.stickerCode || vehicle.sticker.id}
              </div>
            )}

            {/* Share Ride Details for Passenger Safety */}
            <ShareRideButton
              makeModel={vehicle.makeModel || undefined}
              registrationNumber={vehicle.registrationNumber}
              fleetNumber={vehicle.fleetNumber}
              driverName={driver?.fullName || "Official TRACAS Driver"}
              driverPhone={driver?.phoneNumber || "N/A"}
              driverSecurityCode={driver?.securityCode || undefined}
              assignedRoute={vehicle.assignedRoute || undefined}
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
