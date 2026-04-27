"use client";

/**
 * Generate Vehicle QR Codes — Ministry of Transport Platform
 * STORY-047 | FR-026
 *
 * Commissioner / PS generates unique QR codes for each vehicle in the fleet.
 * Only vehicles without an existing QR code are shown.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFleetApplication,
  generateVehicleQRCode,
} from "@/app/actions/mass-transit";
import type { FleetApplicationDetail } from "@/app/actions/mass-transit";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function GenerateQRPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [company, setCompany] = useState<FleetApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getFleetApplication(companyId).then((r) => {
      if (r.success) setCompany(r.data!);
      setLoading(false);
    });
  }, [companyId]);

  function generateQR(vehicleId: string, registrationNumber: string) {
    const fd = new FormData();
    fd.set("vehicleId", vehicleId);
    fd.set("companyId", companyId);
    fd.set("registrationNumber", registrationNumber);

    startTransition(async () => {
      const result = await generateVehicleQRCode(undefined, fd);
      if (result.success) {
        setGenerated((prev) => ({ ...prev, [vehicleId]: true }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next[vehicleId];
          return next;
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          [vehicleId]: result.error ?? "Failed to generate QR",
        }));
      }
    });
  }

  function generateAll() {
    if (!company) return;
    const pending = company.vehicles.filter(
      (v) => !v.qrCodeId && !generated[v.id],
    );
    for (const v of pending) {
      generateQR(v.id, v.registrationNumber);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!company) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Fleet application not found.</AlertDescription>
      </Alert>
    );
  }

  const pendingVehicles = company.vehicles.filter(
    (v) => !v.qrCodeId && !generated[v.id],
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <Link
            href={`/fleet-operators/${companyId}`}
            className="hover:underline">
            {company.companyName}
          </Link>
          {" / "}
          <span>Generate QR Codes</span>
        </nav>
        <h1 className="text-2xl font-semibold">Generate Vehicle QR Codes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-026: Each vehicle receives a unique QR code for roadside
          identification and verification.
        </p>
      </div>

      {pendingVehicles.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={generateAll} disabled={isPending}>
            Generate All ({pendingVehicles.length} remaining)
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Fleet Vehicles ({company.vehicles.length})
          </CardTitle>
          <CardDescription>
            QR codes encode:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              MOT/VEH/&#123;vehicleId&#125;/&#123;registrationNumber&#125;
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    Registration
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                    Make / Model
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                    QR Status
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {company.vehicles.map((v, i) => {
                  const isDone = !!v.qrCodeId || generated[v.id];
                  return (
                    <tr
                      key={v.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {v.registrationNumber}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">
                        {v.make} {v.model}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isDone ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-700 border-green-300">
                            ✓ Generated
                          </Badge>
                        ) : errors[v.id] ? (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!isDone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              generateQR(v.id, v.registrationNumber)
                            }
                            disabled={isPending}>
                            Generate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Some QR codes could not be generated. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/fleet-operators/${companyId}`}>← Back to Company</Link>
        </Button>
      </div>
    </div>
  );
}
