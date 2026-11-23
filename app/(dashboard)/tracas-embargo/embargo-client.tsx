"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TracasNavTabs } from "@/components/tracas/tracas-nav-tabs";
import {
  liftEmbargo,
  placeEmbargo,
  type EmbargoRow,
} from "@/app/actions/tracas-embargo";

type StatusFilter = "ACTIVE" | "LIFTED" | "ALL";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function EmbargoClient({
  role,
  rows,
  total,
  page,
  totalPages,
  activeCount,
  status,
  search,
  canPlace,
  canLift,
}: {
  role: string;
  rows: EmbargoRow[];
  total: number;
  page: number;
  totalPages: number;
  activeCount: number;
  status: StatusFilter;
  search: string;
  canPlace: boolean;
  canLift: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ── Place ──
  const [form, setForm] = useState({
    plateNumber: "",
    reason: "",
    locationFound: "",
    sanction: "",
  });

  const submitPlace = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await placeEmbargo(form);
      if (res.success) {
        toast.success("Vehicle placed in the embargo pool.");
        setForm({ plateNumber: "", reason: "", locationFound: "", sanction: "" });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  // ── Lift ──
  const [liftTarget, setLiftTarget] = useState<EmbargoRow | null>(null);
  const [liftNote, setLiftNote] = useState("");

  const submitLift = () => {
    if (!liftTarget) return;
    startTransition(async () => {
      const res = await liftEmbargo(liftTarget.id, liftNote);
      if (res.success) {
        toast.success(
          `Embargo on ${liftTarget.plateNumber} lifted. It can now be registered.`,
        );
        setLiftTarget(null);
        setLiftNote("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const hrefFor = (next: { status?: StatusFilter; page?: number }) => {
    const p = new URLSearchParams();
    const s = next.status ?? status;
    if (s !== "ACTIVE") p.set("status", s);
    if (search) p.set("q", search);
    if ((next.page ?? 1) > 1) p.set("page", String(next.page));
    const qs = p.toString();
    return `/tracas-embargo${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <TracasNavTabs role={role} />

      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Embargo Pool
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vehicles caught operating without being onboarded. A vehicle here
          cannot be registered — the enumerator is stopped at the plate number
          — until the System Admin, Admin or TRACAS MD lifts the embargo. These
          vehicles are not on the fleet and are not counted in it.
        </p>
      </div>

      {canPlace && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              Place a vehicle under embargo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={submitPlace} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="emb-plate">Plate number *</Label>
                <Input
                  id="emb-plate"
                  required
                  placeholder="e.g. AKD 910 YE"
                  value={form.plateNumber}
                  onChange={(e) =>
                    setForm({ ...form, plateNumber: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emb-location">Where it was found *</Label>
                <Input
                  id="emb-location"
                  required
                  maxLength={500}
                  placeholder="e.g. Onitsha Upper Iweka, near the bridge head"
                  value={form.locationFound}
                  onChange={(e) =>
                    setForm({ ...form, locationFound: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="emb-reason">Reason for the embargo *</Label>
                <Textarea
                  id="emb-reason"
                  required
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. Operating as a commercial shuttle without being onboarded"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="emb-sanction">
                  Penalty / sanction required{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="emb-sanction"
                  maxLength={500}
                  placeholder="e.g. Pay the penalty at the TRACAS office before onboarding"
                  value={form.sanction}
                  onChange={(e) => setForm({ ...form, sanction: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={pending}
                  className="bg-red-600 text-white hover:bg-red-700">
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Place under embargo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl bg-secondary p-1">
          {(["ACTIVE", "LIFTED", "ALL"] as StatusFilter[]).map((s) => (
            <Link
              key={s}
              href={hrefFor({ status: s })}
              aria-current={status === s ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {s === "ACTIVE" ? `Active (${activeCount})` : s === "LIFTED" ? "Lifted" : "All"}
            </Link>
          ))}
        </div>
        <form action="/tracas-embargo" className="flex gap-2">
          {status !== "ACTIVE" && <input type="hidden" name="status" value={status} />}
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search plate, reason or location"
            className="w-64"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {/* ── List ── */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {status === "ACTIVE"
                ? "No vehicles are under embargo."
                : "Nothing to show."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-foreground">
                        {r.plateNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          r.status === "ACTIVE"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        }`}>
                        {r.status === "ACTIVE" ? "Embargoed" : "Lifted"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Found at: {r.locationFound}
                    </p>
                    {r.sanction && (
                      <p className="text-xs text-muted-foreground">
                        Sanction required: {r.sanction}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Placed {fmt(r.placedAt)} by {r.placedBy}
                      {r.status === "LIFTED" && r.liftedAt && (
                        <>
                          {" "}· Lifted {fmt(r.liftedAt)}
                          {r.liftedBy ? ` by ${r.liftedBy}` : ""}
                          {r.liftNote ? ` — ${r.liftNote}` : ""}
                        </>
                      )}
                    </p>
                  </div>
                  {r.status === "ACTIVE" && canLift && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setLiftTarget(r);
                        setLiftNote("");
                      }}>
                      Lift embargo
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefFor({ page: page - 1 })}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefFor({ page: page + 1 })}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Lift dialog ── */}
      <Dialog open={!!liftTarget} onOpenChange={(o) => !o && setLiftTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift embargo on {liftTarget?.plateNumber}</DialogTitle>
            <DialogDescription>
              Once lifted, an enumerator can register this vehicle. Record why
              it is being lifted, for example the penalty receipt reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="lift-note">Reason / receipt reference *</Label>
            <Textarea
              id="lift-note"
              rows={3}
              maxLength={500}
              value={liftNote}
              onChange={(e) => setLiftNote(e.target.value)}
              placeholder="e.g. Penalty paid — receipt TRC-20481"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiftTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submitLift} disabled={pending || !liftNote.trim()}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lift embargo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
