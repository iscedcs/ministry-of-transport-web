"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-green-500/20 text-green-400 rounded-xl border border-green-500/30">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Boats & Waterways Fleet</h1>
              <p className="text-sm text-slate-400">
                Maritime transport vessel onboarding, rider management, & security QR verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsOnboardRiderOpen(true)}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            <UserPlus className="w-4 h-4 mr-2 text-green-400" />
            Add Rider
          </Button>

          <Button
            onClick={() => setIsAddStickersOpen(true)}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            <Tag className="w-4 h-4 mr-2 text-amber-400" />
            Pre-Load Stickers
          </Button>

          <Button
            onClick={() => setIsOnboardBoatOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Onboard Boat
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Onboarded Boats</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{initialBoats.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Anchor className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Boat Riders</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{initialRiders.length}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Stickers Pool</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{initialAvailableStickers.length}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Tag className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Linked QR Stickers</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {initialAllStickers.filter((s) => s.isAssigned).length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
              <QrCode className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab("boats")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "boats"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Boat Fleet ({filteredBoats.length})
          </button>
          <button
            onClick={() => setActiveTab("riders")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "riders"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Riders / Drivers ({initialRiders.length})
          </button>
          <button
            onClick={() => setActiveTab("stickers")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "stickers"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Sticker Inventory ({initialAllStickers.length})
          </button>
        </div>

        {activeTab === "boats" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search boats, reg, security code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "boats" && (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4">Boat Details</th>
                  <th className="p-4">Registration No.</th>
                  <th className="p-4">Security Code</th>
                  <th className="p-4">Assigned Rider</th>
                  <th className="p-4">Sticker QR</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredBoats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No boats found. Click <strong>Onboard Boat</strong> to register a vessel.
                    </td>
                  </tr>
                ) : (
                  filteredBoats.map((boat) => (
                    <tr key={boat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                            ⛵
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{boat.name}</div>
                            <div className="text-xs text-slate-500">
                              {boat.boatType} • {boat.capacity || 10} Pax Capacity
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {boat.registrationNumber}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {boat.securityCode}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {boat.assignedRider ? (
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{boat.assignedRider.fullName}</div>
                            <div className="text-xs text-slate-500">{boat.assignedRider.phoneNumber}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 px-2 py-1 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {boat.sticker ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none flex items-center w-fit">
                            <Tag className="w-3 h-3 mr-1" />
                            {boat.sticker.stickerCode || "Linked"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No Sticker</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                          {boat.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBoatForReassign(boat);
                            setReassignRiderId(boat.assignedRiderId || "none");
                            setIsReassignRiderOpen(true);
                          }}
                          className="h-8 text-xs border-slate-300"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reassign Rider
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/verify/boat/${boat.id}`, "_blank")}
                          className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Public Verification
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "riders" && (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4">Rider Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Marine License No.</th>
                  <th className="p-4">Currently Operating</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {initialRiders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No boat riders registered yet. Click <strong>Add Rider</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  initialRiders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {rider.fullName[0]}
                        </div>
                        <span>{rider.fullName}</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{rider.phoneNumber}</td>
                      <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {rider.licenseNumber}
                      </td>
                      <td className="p-4">
                        {rider.boats && rider.boats.length > 0 ? (
                          <div className="space-y-1">
                            {rider.boats.map((b) => (
                              <Badge key={b.id} variant="secondary" className="text-xs bg-slate-100 text-slate-800 mr-1">
                                ⛵ {b.name} ({b.registrationNumber})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not assigned to any boat</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className="bg-emerald-100 text-emerald-800 border-none">{rider.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "stickers" && (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Pre-Loaded Physical Sticker Inventory</h3>
              <p className="text-xs text-slate-500">QR Sticker URLs provided by vendor waiting to be bound to boats.</p>
            </div>
            <Button size="sm" onClick={() => setIsAddStickersOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Pre-Load Stickers
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4">Sticker Code</th>
                  <th className="p-4">Sticker Target QR URL</th>
                  <th className="p-4">Assignment State</th>
                  <th className="p-4">Bound Boat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {initialAllStickers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No physical stickers pre-loaded. Click <strong>Pre-Load Stickers</strong> to add QR URLs.
                    </td>
                  </tr>
                ) : (
                  initialAllStickers.map((stk) => (
                    <tr key={stk.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {stk.stickerCode || "N/A"}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {stk.stickerUrl}
                      </td>
                      <td className="p-4">
                        {stk.isAssigned ? (
                          <Badge className="bg-green-100 text-green-800 border-none">Assigned</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-none">Available Pool</Badge>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        {stk.assignedBoat ? (
                          <span>
                            {stk.assignedBoat.name} ({stk.assignedBoat.registrationNumber})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal: Onboard Boat ── */}
      <Dialog open={isOnboardBoatOpen} onOpenChange={setIsOnboardBoatOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleOnboardBoat}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5 text-green-600" />
                <span>Onboard New Boat</span>
              </DialogTitle>
              <DialogDescription>
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
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="boat-type">Boat Category</Label>
                  <Select
                    value={boatForm.boatType}
                    onValueChange={(val) => setBoatForm({ ...boatForm, boatType: val })}
                  >
                    <SelectTrigger id="boat-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
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
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engine-no">Engine Serial (Optional)</Label>
                  <Input
                    id="engine-no"
                    placeholder="e.g. ENG-9920"
                    value={boatForm.engineNumber}
                    onChange={(e) => setBoatForm({ ...boatForm, engineNumber: e.target.value })}
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
                  <SelectTrigger id="sticker-select" className="bg-amber-50/50 border-amber-200">
                    <SelectValue placeholder="Select sticker from pool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Sticker (Assign Later)</SelectItem>
                    {initialAvailableStickers.map((stk) => (
                      <SelectItem key={stk.id} value={stk.id}>
                        {stk.stickerCode ? `Code: ${stk.stickerCode}` : stk.stickerUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {initialAvailableStickers.length === 0 && (
                  <p className="text-xs text-amber-600 italic">
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
                  <SelectTrigger id="rider-select">
                    <SelectValue placeholder="Select active rider" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading ? "Onboarding..." : "Onboard Boat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Rider ── */}
      <Dialog open={isOnboardRiderOpen} onOpenChange={setIsOnboardRiderOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleOnboardRider}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Register Boat Rider / Driver</span>
              </DialogTitle>
              <DialogDescription>Add a licensed marine operator into the system.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="rider-name">Full Name *</Label>
                <Input
                  id="rider-name"
                  placeholder="e.g. Captain John Doe"
                  value={riderForm.fullName}
                  onChange={(e) => setRiderForm({ ...riderForm, fullName: e.target.value })}
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
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOnboardRiderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? "Saving..." : "Save Rider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Reassign Rider ── */}
      <Dialog open={isReassignRiderOpen} onOpenChange={setIsReassignRiderOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleReassignRiderSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <span>Reassign Rider for Boat</span>
              </DialogTitle>
              <DialogDescription>
                Reassign driver operating <strong>{selectedBoatForReassign?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Selected Boat</Label>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">
                  ⛵ {selectedBoatForReassign?.name} ({selectedBoatForReassign?.registrationNumber})
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reassign-select">Select New Rider</Label>
                <Select value={reassignRiderId} onValueChange={(val) => setReassignRiderId(val)}>
                  <SelectTrigger id="reassign-select">
                    <SelectValue placeholder="Select rider" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Updating..." : "Update Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Pre-Load Sticker URLs ── */}
      <Dialog open={isAddStickersOpen} onOpenChange={setIsAddStickersOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddStickersSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <span>Pre-Load Physical Sticker URLs</span>
              </DialogTitle>
              <DialogDescription>
                Paste QR code sticker URLs provided by the team (one URL per line).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="sticker-urls">Sticker URLs List (One per line) *</Label>
                <Textarea
                  id="sticker-urls"
                  rows={5}
                  placeholder="https://external-domain.com/qr/STK-001&#10;https://external-domain.com/qr/STK-002&#10;https://external-domain.com/qr/STK-003"
                  value={batchStickerUrls}
                  onChange={(e) => setBatchStickerUrls(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStickersOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {loading ? "Importing..." : "Add to Pool"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
