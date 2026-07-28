import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import ShareRideButton from "./share-ride-button";
import {
  ShieldCheck,
  Anchor,
  CheckCircle2,
  User,
  Info,
  MapPin,
} from "lucide-react";

export default async function VerifyBoatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try fetching boat by ID or securityCode or sticker URL/code
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Background Watermark */}
        <div className="absolute inset-0 top-32 flex items-center justify-center pointer-events-none z-0">
          <Image
            src="/anambra_mot_logo.png"
            alt=""
            width={320}
            height={320}
            className="opacity-[0.04] object-contain"
          />
        </div>

        {/* Header Header */}
        <div className="bg-gradient-to-b from-green-600 to-emerald-700 pt-8 pb-16 px-6 text-center text-white relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-semibold text-xs tracking-wider uppercase mb-2">
            Verified Maritime Transport
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">{boat.name}</h1>
          <p className="text-xs text-green-100 mt-1">
            Ministry of Transport, Anambra State
          </p>
        </div>

        {/* Content Card Body */}
        <div className="px-6 pb-6 pt-0 flex flex-col items-center relative z-10">
          {/* Security Badge Pill Floating */}
          <div className="-mt-7 z-20 bg-slate-900 text-white px-5 py-2 rounded-full shadow-xl border-2 border-green-500 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <span className="font-mono text-sm font-bold tracking-wider">
              {boat.securityCode}
            </span>
          </div>

          <div className="w-full space-y-4 mt-6">
            {/* Status Indicator */}
            <div className="flex items-center justify-between p-3.5 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 text-green-800 dark:text-green-300 font-semibold text-sm">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span>Verification Status</span>
              </div>
              <Badge className="bg-green-600 text-white hover:bg-green-600 font-bold">
                {boat.status}
              </Badge>
            </div>

            {/* Vessel Specifications */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 flex items-center text-xs">
                  <Anchor className="w-3.5 h-3.5 mr-1.5 text-blue-500" />{" "}
                  Registration No.
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {boat.registrationNumber}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 flex items-center text-xs">
                  <Info className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Vessel
                  Category
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {boat.boatType}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 flex items-center text-xs">
                  <User className="w-3.5 h-3.5 mr-1.5 text-amber-500" />{" "}
                  Passenger Capacity
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {boat.capacity || 10} Persons
                </span>
              </div>
            </div>

            {/* Assigned Rider Information */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center">
                <User className="w-3.5 h-3.5 mr-1" /> Licensed Boat Operator /
                Driver
              </div>

              {boat.assignedRider ? (
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                    {boat.assignedRider.fullName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {boat.assignedRider.fullName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      License:{" "}
                      <span className="font-mono">
                        {boat.assignedRider.licenseNumber}
                      </span>{" "}
                      • {boat.assignedRider.phoneNumber}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 italic">
                  No assigned operator recorded for this vessel.
                </p>
              )}
            </div>

            {/* QR Sticker Verification Tag */}
            {boat.sticker && (
              <div className="text-center text-xs text-slate-400 font-mono">
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
              <p className="text-[11px] text-slate-400">
                Official Verification Portal • State Government of Anambra
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
