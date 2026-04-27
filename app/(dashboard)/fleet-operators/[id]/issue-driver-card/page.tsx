"use client";

/**
 * Issue Driver Proficiency Cards — Ministry of Transport Platform
 * STORY-043 | FR-029
 *
 * Commissioner / PS issues proficiency cards to registered drivers.
 * Card number format: MOT/DPC/YYYY/NNNNN
 * Card is valid for 1 year.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getFleetApplication,
  issueDriverProficiencyCard,
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

export default function IssueDriverCardPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [company, setCompany] = useState<FleetApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getFleetApplication(companyId).then((r) => {
      if (r.success) setCompany(r.data!);
      setLoading(false);
    });
  }, [companyId]);

  function issueCard(driverId: string) {
    const fd = new FormData();
    fd.set("driverId", driverId);
    fd.set("companyId", companyId);

    startTransition(async () => {
      const result = await issueDriverProficiencyCard(undefined, fd);
      if (result.success) {
        setIssued((prev) => ({ ...prev, [driverId]: true }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next[driverId];
          return next;
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          [driverId]: result.error ?? "Failed to issue card",
        }));
      }
    });
  }

  function issueAllCards() {
    if (!company) return;
    const pending = company.drivers.filter(
      (d) => !d.proficiencyCardId && !issued[d.id],
    );
    for (const d of pending) {
      issueCard(d.id);
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

  const pendingDrivers = company.drivers.filter(
    (d) => !d.proficiencyCardId && !issued[d.id],
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
          <span>Issue Driver Cards</span>
        </nav>
        <h1 className="text-2xl font-semibold">
          Issue Driver Proficiency Cards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-029: Issue a proficiency card to each registered driver. Card
          numbers follow the format{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            MOT/DPC/YYYY/NNNNN
          </code>{" "}
          and are valid for 1 year.
        </p>
      </div>

      {company.drivers.length === 0 ? (
        <Alert>
          <AlertDescription>
            No drivers registered for this company yet. Drivers are auto-created
            from vehicle assignment data during application.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {pendingDrivers.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={issueAllCards} disabled={isPending}>
                Issue All Cards ({pendingDrivers.length} pending)
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Registered Drivers ({company.drivers.length})
              </CardTitle>
              <CardDescription>
                Drivers sourced from vehicle assignment records
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        Driver Name
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                        License No.
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                        Phone
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                        Card Status
                      </th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {company.drivers.map((d, i) => {
                      const isDone = !!d.proficiencyCardId || issued[d.id];
                      return (
                        <tr
                          key={d.id}
                          className={
                            i % 2 === 0 ? "bg-background" : "bg-muted/20"
                          }>
                          <td className="px-4 py-2.5 font-medium">
                            {d.fullName}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs hidden sm:table-cell">
                            {d.licenseNumber || "—"}
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            {d.phoneNumber || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isDone ? (
                              <Badge
                                variant="outline"
                                className="text-xs text-green-700 border-green-300">
                                ✓ Issued
                              </Badge>
                            ) : errors[d.id] ? (
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
                                onClick={() => issueCard(d.id)}
                                disabled={isPending}>
                                Issue Card
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
                Some cards could not be issued. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/fleet-operators/${companyId}`}>← Back to Company</Link>
        </Button>
      </div>
    </div>
  );
}
