"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  Car,
  User,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Filter,
  Layers,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CvrVehicleRow, CvrDriverRow } from "@/app/actions/cvr";
import type { CvrRegistrationStatus, UserRole } from "@prisma/client";
import { fmtDateShort } from "@/lib/utils/format";

interface CommercialVehiclesClientProps {
  vehicles: CvrVehicleRow[];
  drivers: CvrDriverRow[];
  stats: {
    total: number;
    identified: number;
    pendingVin: number;
    driverTotal: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  activeTab: "vehicles" | "drivers";
  statusFilter?: CvrRegistrationStatus;
  searchQuery: string;
  userRole: UserRole;
  canWrite: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TRICYCLE: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  BUS: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  SHUTTLE_BUS: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  TRUCK: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  MINIBUS: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  OTHER: { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30" },
};

export default function CommercialVehiclesClient({
  vehicles,
  drivers,
  stats,
  pagination,
  activeTab,
  statusFilter,
  searchQuery,
  userRole,
  canWrite,
}: CommercialVehiclesClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"vehicles" | "drivers">(activeTab);
  const [search, setSearch] = useState(searchQuery);
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter ?? "ALL");
  const [isPending, startTransition] = useTransition();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (search.trim()) params.set("q", search.trim());
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      params.set("page", "1");
      router.push(`/commercial-vehicles?${params.toString()}`);
    });
  };

  const handleTabChange = (newTab: "vehicles" | "drivers") => {
    setTab(newTab);
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("tab", newTab);
      if (search.trim()) params.set("q", search.trim());
      router.push(`/commercial-vehicles?${params.toString()}`);
    });
  };

  const handleStatusChange = (st: string) => {
    setSelectedStatus(st);
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("tab", "vehicles");
      if (search.trim()) params.set("q", search.trim());
      if (st !== "ALL") params.set("status", st);
      router.push(`/commercial-vehicles?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (search.trim()) params.set("q", search.trim());
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      params.set("page", String(newPage));
      router.push(`/commercial-vehicles?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header with Title and Registration Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Commercial Vehicle Registration
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-primary/40 text-primary">
              CVR
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ministry onboarding register for commercial vehicles, designated drivers, and Stage 2 VIN allocation.
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-3">
            <Link href="/commercial-vehicles/register">
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-950/20 cursor-pointer">
                <Plus className="w-4 h-4" /> Register Vehicle
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Vehicles
              </p>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">
              {stats.total}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Registered commercial vehicles
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Stage 2 VIN
              </p>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-400 mt-2">
              {stats.pendingVin}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Stage 1 complete & awaiting VIN
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stage 2 Identified
              </p>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-cyan-400 mt-2">
              {stats.identified}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              VIN assigned & verified
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Drivers Register
              </p>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <User className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-2">
              {stats.driverTotal}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Onboarded commercial drivers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange("vehicles")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                tab === "vehicles"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Vehicles ({stats.total})</span>
            </button>
            <button
              onClick={() => handleTabChange("drivers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                tab === "drivers"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Drivers ({stats.driverTotal})</span>
            </button>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={tab === "vehicles" ? "Search plate, chassis, VIN, sticker..." : "Search driver name, phone..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border/70 rounded-xl text-sm"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="rounded-xl px-4 cursor-pointer">
              Search
            </Button>
          </form>
        </div>

        {/* Status Filter for Vehicles */}
        {tab === "vehicles" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { label: "All Vehicles", val: "ALL" },
              { label: "Stage 1 (Pending VIN)", val: "REGISTERED" },
              { label: "Stage 2 (Identified)", val: "IDENTIFIED" },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => handleStatusChange(f.val)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedStatus === f.val
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content View */}
      {tab === "vehicles" ? (
        <div className="space-y-4">
          {vehicles.length === 0 ? (
            <Card className="border-border/60 bg-card p-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No commercial vehicles found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter
                  ? "No vehicle records match your active filters. Try clearing search keywords."
                  : "No commercial vehicles have been registered yet. Start by onboarding a vehicle."}
              </p>
              {canWrite && (
                <div className="mt-5">
                  <Link href="/commercial-vehicles/register">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl cursor-pointer">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Onboard First Vehicle
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          ) : (
            <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Vehicle Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Operation & Route</th>
                      <th className="py-3 px-4">Driver</th>
                      <th className="py-3 px-4">Sticker</th>
                      <th className="py-3 px-4">VIN (Stage 2)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {vehicles.map((v) => {
                      const catStyle = CATEGORY_COLORS[v.category] || CATEGORY_COLORS.OTHER;
                      return (
                        <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                          {/* Vehicle Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-sm font-mono">{v.plateNumber}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Chassis: <span className="font-mono">{v.chassisNumber}</span>
                            </div>
                            {(v.make || v.model) && (
                              <div className="text-[11px] text-muted-foreground">
                                {[v.make, v.model].filter(Boolean).join(" ")}
                                {v.color ? ` • ${v.color}` : ""}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              {v.category.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Operation & Route */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">
                              {v.operationType ? v.operationType.replace(/_/g, " ") : "Town Service"}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground/70" />
                              {[v.townName, v.lgaName].filter(Boolean).join(", ") || "Anambra State"}
                            </div>
                          </td>

                          {/* Driver */}
                          <td className="py-3.5 px-4">
                            {v.driverName ? (
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <User className="w-3.5 h-3.5 text-primary" />
                                <span>{v.driverName}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                            )}
                          </td>

                          {/* Sticker Number */}
                          <td className="py-3.5 px-4">
                            {v.stickerNumber ? (
                              <span className="font-mono text-[11px] bg-slate-800/80 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                {v.stickerNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic">No sticker</span>
                            )}
                          </td>

                          {/* VIN */}
                          <td className="py-3.5 px-4">
                            {v.vin ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{v.vin}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
                                <Clock className="w-3 h-3" /> Pending Stage 2
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {v.status === "IDENTIFIED" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px]">
                                Identified
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px]">
                                Registered
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/commercial-vehicles/${v.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                              >
                                View <ArrowRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Drivers Tab */
        <div className="space-y-4">
          {drivers.length === 0 ? (
            <Card className="border-border/60 bg-card p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No drivers found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No commercial vehicle drivers have been registered yet. Drivers are captured during vehicle onboarding.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((d) => (
                <Card key={d.id} className="border-border/60 bg-card hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      {d.passportPhotoUrl ? (
                        <img
                          src={d.passportPhotoUrl}
                          alt={d.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border border-border/80 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base flex-shrink-0">
                          {d.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-foreground text-sm truncate">{d.fullName}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono">
                            {d.gender}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Phone className="w-3 h-3" />
                          <span>{d.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{[d.city, d.state].filter(Boolean).join(", ") || "Anambra"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Assigned vehicles: <strong className="text-foreground">{d.vehicleCount}</strong>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDateShort(d.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <div>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="rounded-xl cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="rounded-xl cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
