"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  onboardBoat,
  onboardRider,
  reassignRider,
  addStickerUrlsToPool,
} from "@/app/actions/boats";
import { toast } from "sonner";
import {
  Anchor,
  Plus,
  QrCode,
  UserCheck,
  UserPlus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Tag,
  Ship,
} from "lucide-react";

interface BoatItem {
  id: string;
  name: string;
  registrationNumber: string;
  boatType: string;
  capacity: number | null;
  securityCode: string;
  status: string;
  assignedRiderId: string | null;
  assignedRider: {
    id: string;
    fullName: string;
    phoneNumber: string;
    licenseNumber: string;
  } | null;
  sticker: {
    id: string;
    stickerUrl: string;
    stickerCode: string | null;
  } | null;
  createdAt: Date;
}

interface RiderItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  licenseNumber: string;
  status: string;
  boats?: { id: string; name: string; registrationNumber: string }[];
}

interface StickerItem {
  id: string;
  stickerUrl: string;
  stickerCode: string | null;
  isAssigned: boolean;
  assignedBoatId: string | null;
  assignedBoat?: { id: string; name: string; registrationNumber: string } | null;
}

interface BoatsClientProps {
  initialBoats: BoatItem[];
  initialRiders: RiderItem[];
  initialAvailableStickers: StickerItem[];
  initialAllStickers: StickerItem[];
}

export default function BoatsClient({
  initialBoats,
  initialRiders,
  initialAvailableStickers,
  initialAllStickers,
}: BoatsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"boats" | "stickers" | "riders">("boats");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isOnboardBoatOpen, setIsOnboardBoatOpen] = useState(false);
  const [isOnboardRiderOpen, setIsOnboardRiderOpen] = useState(false);
  const [isReassignRiderOpen, setIsReassignRiderOpen] = useState(false);
  const [isAddStickersOpen, setIsAddStickersOpen] = useState(false);

  // Form states
  const [boatForm, setBoatForm] = useState({
    name: "",
    registrationNumber: "",
    boatType: "SPEEDBOAT",
    capacity: "10",
    engineNumber: "",
    chassisNumber: "",
    stickerId: "none",
    assignedRiderId: "none",
  });

  const [riderForm, setRiderForm] = useState({
    fullName: "",
    phoneNumber: "",
    licenseNumber: "",
  });

  const [selectedBoatForReassign, setSelectedBoatForReassign] = useState<BoatItem | null>(null);
  const [reassignRiderId, setReassignRiderId] = useState<string>("none");

  const [batchStickerUrls, setBatchStickerUrls] = useState("");
  const [loading, setLoading] = useState(false);

  // Filtered boats
  const filteredBoats = initialBoats.filter((boat) => {
    const q = searchQuery.toLowerCase();
    return (
      boat.name.toLowerCase().includes(q) ||
      boat.registrationNumber.toLowerCase().includes(q) ||
      boat.securityCode.toLowerCase().includes(q) ||
      (boat.assignedRider?.fullName || "").toLowerCase().includes(q)
    );
  });

  // Handlers
  async function handleOnboardBoat(e: React.FormEvent) {
    e.preventDefault();
    if (!boatForm.name || !boatForm.registrationNumber) {
      toast.error("Boat name and registration number are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await onboardBoat({
        name: boatForm.name,
        registrationNumber: boatForm.registrationNumber,
        boatType: boatForm.boatType,
        capacity: Number(boatForm.capacity) || 10,
        engineNumber: boatForm.engineNumber,
        chassisNumber: boatForm.chassisNumber,
        stickerId: boatForm.stickerId !== "none" ? boatForm.stickerId : undefined,
        assignedRiderId: boatForm.assignedRiderId !== "none" ? boatForm.assignedRiderId : undefined,
      });

      if (res.success && res.data) {
        toast.success(`Boat '${res.data.name}' onboarded successfully! Security Code: ${res.data.securityCode}`);
        setIsOnboardBoatOpen(false);
        setBoatForm({
          name: "",
          registrationNumber: "",
          boatType: "SPEEDBOAT",
          capacity: "10",
          engineNumber: "",
          chassisNumber: "",
          stickerId: "none",
          assignedRiderId: "none",
        });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to onboard boat.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboardRider(e: React.FormEvent) {
    e.preventDefault();
    if (!riderForm.fullName || !riderForm.phoneNumber || !riderForm.licenseNumber) {
      toast.error("All rider fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await onboardRider({
        fullName: riderForm.fullName,
        phoneNumber: riderForm.phoneNumber,
        licenseNumber: riderForm.licenseNumber,
      });

      if (res.success && res.data) {
        toast.success(`Rider '${res.data.fullName}' added successfully!`);
        setIsOnboardRiderOpen(false);
        setRiderForm({ fullName: "", phoneNumber: "", licenseNumber: "" });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to onboard rider.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReassignRiderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBoatForReassign) return;
    setLoading(true);
    try {
      const targetRiderId = reassignRiderId === "none" ? null : reassignRiderId;
      const res = await reassignRider(selectedBoatForReassign.id, targetRiderId);
      if (res.success) {
        toast.success(`Rider reassigned for boat '${selectedBoatForReassign.name}'.`);
        setIsReassignRiderOpen(false);
        setSelectedBoatForReassign(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reassign rider.");
      }
    } catch (err: any) {
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStickersSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = batchStickerUrls
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (urls.length === 0) {
      toast.error("Please enter at least one sticker URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await addStickerUrlsToPool(urls);
      if (res.success) {
        toast.success(`Added ${res.count} sticker(s) to inventory pool.`);
        setIsAddStickersOpen(false);
        setBatchStickerUrls("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to add stickers.");
      }
    } catch (err: any) {
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Boats & Waterways Fleet
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Maritime transport vessel onboarding, rider management, & security QR verification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsOnboardRiderOpen(true)}
            variant="outline"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5 text-primary" />
            Add Rider
          </Button>

          <Button
            onClick={() => setIsAddStickersOpen(true)}
            variant="outline"
            size="sm"
          >
            <Tag className="w-4 h-4 mr-1.5 text-warning" />
            Pre-Load Stickers
          </Button>

          <Button
            onClick={() => setIsOnboardBoatOpen(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Onboard Boat
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Onboarded Boats
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{initialBoats.length}</h3>
            </div>
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Anchor className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Boat Riders
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{initialRiders.length}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Stickers Pool
              </p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{initialAvailableStickers.length}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Linked QR Stickers
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {initialAllStickers.filter((s) => s.isAssigned).length}
              </h3>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("boats")}
            className={
              activeTab === "boats"
                ? "px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-sm"
                : "px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-colors"
            }
          >
            Boat Fleet ({filteredBoats.length})
          </button>
          <button
            onClick={() => setActiveTab("riders")}
            className={
              activeTab === "riders"
                ? "px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-sm"
                : "px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-colors"
            }
          >
            Riders / Drivers ({initialRiders.length})
          </button>
          <button
            onClick={() => setActiveTab("stickers")}
            className={
              activeTab === "stickers"
                ? "px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-sm"
                : "px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-colors"
            }
          >
            Sticker Inventory ({initialAllStickers.length})
          </button>
        </div>

        {activeTab === "boats" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search boats, reg, security code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border text-xs text-foreground"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "boats" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Boat Details</th>
                  <th className="px-4 py-3">Registration No.</th>
                  <th className="px-4 py-3">Security Code</th>
                  <th className="px-4 py-3">Assigned Rider</th>
                  <th className="px-4 py-3">Sticker QR</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredBoats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No boats found. Click <strong className="text-foreground">Onboard Boat</strong> to register a vessel.
                    </td>
                  </tr>
                ) : (
                  filteredBoats.map((boat) => (
                    <tr key={boat.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            ⛵
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{boat.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {boat.boatType} • {boat.capacity || 10} Pax
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {boat.registrationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold inline-flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {boat.securityCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {boat.assignedRider ? (
                          <div>
                            <div className="font-medium text-foreground">{boat.assignedRider.fullName}</div>
                            <div className="text-xs text-muted-foreground">{boat.assignedRider.phoneNumber}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {boat.sticker ? (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            {boat.sticker.stickerCode || "Linked"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Sticker</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {boat.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBoatForReassign(boat);
                            setReassignRiderId(boat.assignedRiderId || "none");
                            setIsReassignRiderOpen(true);
                          }}
                          className="h-8 text-xs border-border"
                        >
                          <RefreshCw className="w-3 h-3 mr-1 text-primary" />
                          Reassign Rider
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/verify/boat/${boat.id}`, "_blank")}
                          className="h-8 text-xs text-primary hover:bg-primary/10"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Public Card
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "riders" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Rider Name</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Marine License No.</th>
                  <th className="px-4 py-3">Currently Operating</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {initialRiders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No boat riders registered yet. Click <strong className="text-foreground">Add Rider</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  initialRiders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                          {rider.fullName[0]}
                        </div>
                        <span>{rider.fullName}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{rider.phoneNumber}</td>
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {rider.licenseNumber}
                      </td>
                      <td className="px-4 py-3">
                        {rider.boats && rider.boats.length > 0 ? (
                          <div className="space-y-1">
                            {rider.boats.map((b) => (
                              <span key={b.id} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded border border-border mr-1 inline-block">
                                ⛵ {b.name} ({b.registrationNumber})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not assigned to any boat</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {rider.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "stickers" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="p-4 bg-secondary border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Pre-Loaded Physical Sticker Inventory</h3>
              <p className="text-xs text-muted-foreground">QR Sticker URLs provided by vendor waiting to be bound to boats.</p>
            </div>
            <Button size="sm" onClick={() => setIsAddStickersOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Pre-Load Stickers
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Sticker Code</th>
                  <th className="px-4 py-3">Sticker Target QR URL</th>
                  <th className="px-4 py-3">Assignment State</th>
                  <th className="px-4 py-3">Bound Boat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {initialAllStickers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No physical stickers pre-loaded. Click <strong className="text-foreground">Pre-Load Stickers</strong> to add QR URLs.
                    </td>
                  </tr>
                ) : (
                  initialAllStickers.map((stk) => (
                    <tr key={stk.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {stk.stickerCode || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                        {stk.stickerUrl}
                      </td>
                      <td className="px-4 py-3">
                        {stk.isAssigned ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Assigned
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Available Pool
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {stk.assignedBoat ? (
                          <span>
                            {stk.assignedBoat.name} ({stk.assignedBoat.registrationNumber})
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Onboard Boat ── */}
      <Dialog open={isOnboardBoatOpen} onOpenChange={setIsOnboardBoatOpen}>
        <DialogContent className="sm:max-w-lg bg-popover border-border text-popover-foreground">
          <form onSubmit={handleOnboardBoat}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5 text-primary" />
                <span>Onboard New Boat</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Register boat details. The system will auto-generate a unique security code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="boat-name">Boat / Vessel Name *</Label>
                <Input
                  id="boat-name"
                  placeholder="e.g. Water Queen 1"
                  value={boatForm.name}
                  onChange={(e) => setBoatForm({ ...boatForm, name: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-num">Registration Number *</Label>
                  <Input
                    id="reg-num"
                    placeholder="e.g. MOT-BOAT-001"
                    value={boatForm.registrationNumber}
                    onChange={(e) => setBoatForm({ ...boatForm, registrationNumber: e.target.value })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="boat-type">Boat Category</Label>
                  <Select
                    value={boatForm.boatType}
                    onValueChange={(val) => setBoatForm({ ...boatForm, boatType: val })}
                  >
                    <SelectTrigger id="boat-type" className="bg-secondary border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="SPEEDBOAT">Speedboat</SelectItem>
                      <SelectItem value="FERRY">Passenger Ferry</SelectItem>
                      <SelectItem value="CANOE">Motorized Canoe</SelectItem>
                      <SelectItem value="CARGO_BARGE">Cargo Barge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="capacity">Passenger Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="10"
                    value={boatForm.capacity}
                    onChange={(e) => setBoatForm({ ...boatForm, capacity: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engine-no">Engine Serial (Optional)</Label>
                  <Input
                    id="engine-no"
                    placeholder="e.g. ENG-9920"
                    value={boatForm.engineNumber}
                    onChange={(e) => setBoatForm({ ...boatForm, engineNumber: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              {/* Sticker Selector from Pool */}
              <div className="space-y-1.5">
                <Label htmlFor="sticker-select">Assign Pre-Loaded QR Sticker (Optional)</Label>
                <Select
                  value={boatForm.stickerId}
                  onValueChange={(val) => setBoatForm({ ...boatForm, stickerId: val })}
                >
                  <SelectTrigger id="sticker-select" className="bg-secondary border-border">
                    <SelectValue placeholder="Select sticker from pool" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">No Sticker (Assign Later)</SelectItem>
                    {initialAvailableStickers.map((stk) => (
                      <SelectItem key={stk.id} value={stk.id}>
                        {stk.stickerCode ? `Code: ${stk.stickerCode}` : stk.stickerUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {initialAvailableStickers.length === 0 && (
                  <p className="text-xs text-warning italic">
                    No available stickers in pool. You can pre-load stickers anytime.
                  </p>
                )}
              </div>

              {/* Rider Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="rider-select">Assign Initial Rider / Operator (Optional)</Label>
                <Select
                  value={boatForm.assignedRiderId}
                  onValueChange={(val) => setBoatForm({ ...boatForm, assignedRiderId: val })}
                >
                  <SelectTrigger id="rider-select" className="bg-secondary border-border">
                    <SelectValue placeholder="Select active rider" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Unassigned / Assign Later</SelectItem>
                    {initialRiders.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.fullName} ({r.licenseNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOnboardBoatOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Onboarding..." : "Onboard Boat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Rider ── */}
      <Dialog open={isOnboardRiderOpen} onOpenChange={setIsOnboardRiderOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-popover-foreground">
          <form onSubmit={handleOnboardRider}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <span>Register Boat Rider / Driver</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">Add a licensed marine operator into the system.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="rider-name">Full Name *</Label>
                <Input
                  id="rider-name"
                  placeholder="e.g. Captain John Doe"
                  value={riderForm.fullName}
                  onChange={(e) => setRiderForm({ ...riderForm, fullName: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rider-phone">Phone Number *</Label>
                <Input
                  id="rider-phone"
                  placeholder="08012345678"
                  value={riderForm.phoneNumber}
                  onChange={(e) => setRiderForm({ ...riderForm, phoneNumber: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rider-license">Marine Operator License No. *</Label>
                <Input
                  id="rider-license"
                  placeholder="e.g. MAR-99821"
                  value={riderForm.licenseNumber}
                  onChange={(e) => setRiderForm({ ...riderForm, licenseNumber: e.target.value })}
                  className="bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOnboardRiderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Rider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Reassign Rider ── */}
      <Dialog open={isReassignRiderOpen} onOpenChange={setIsReassignRiderOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-popover-foreground">
          <form onSubmit={handleReassignRiderSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                <span>Reassign Rider for Boat</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Reassign driver operating <strong>{selectedBoatForReassign?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Selected Boat</Label>
                <div className="p-3 bg-secondary rounded-lg font-medium border border-border">
                  ⛵ {selectedBoatForReassign?.name} ({selectedBoatForReassign?.registrationNumber})
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reassign-select">Select New Rider</Label>
                <Select value={reassignRiderId} onValueChange={(val) => setReassignRiderId(val)}>
                  <SelectTrigger id="reassign-select" className="bg-secondary border-border">
                    <SelectValue placeholder="Select rider" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none">Unassign Driver</SelectItem>
                    {initialRiders.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.fullName} ({r.licenseNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReassignRiderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Pre-Load Sticker URLs ── */}
      <Dialog open={isAddStickersOpen} onOpenChange={setIsAddStickersOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-popover-foreground">
          <form onSubmit={handleAddStickersSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-primary" />
                <span>Pre-Load Physical Sticker URLs</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Paste QR code sticker URLs provided by the team (one URL per line).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="sticker-urls">Sticker URLs List (One per line) *</Label>
                <Textarea
                  id="sticker-urls"
                  rows={5}
                  placeholder="https://transpaytms.com/v/status1772628800404&#10;https://transpaytms.com/v/status1772628288905"
                  value={batchStickerUrls}
                  onChange={(e) => setBatchStickerUrls(e.target.value)}
                  className="font-mono text-xs bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStickersOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Importing..." : "Add to Pool"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
