"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, Tag, CheckCircle2, AlertCircle, RefreshCw, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { attachStickerToVehicle } from "@/app/actions/mass-transit";

interface AttachStickerDialogProps {
  vehicleId: string;
  vehicleReg: string;
  currentSticker?: string | null;
  canAttach?: boolean;
}

/**
 * Interactive sticker attachment dialog with built-in camera QR/barcode scanner
 * and manual sticker number entry.
 */
export function AttachStickerDialog({
  vehicleId,
  vehicleReg,
  currentSticker,
  canAttach = true,
}: AttachStickerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stickerCode, setStickerCode] = useState(currentSticker || "");
  const [isPending, startTransition] = useTransition();

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerId = `reader-vehicle-${vehicleId}`;

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // ignore
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      const element = document.getElementById(readerId);
      if (!element) return;

      await stopCamera();

      const html5QrCode = new Html5Qrcode(readerId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      html5QrCodeRef.current = html5QrCode;

      let cameraConfig: string | { facingMode: string } = { facingMode: "environment" };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          cameraConfig = backCam ? backCam.id : devices[devices.length - 1].id;
        }
      } catch {
        // fallback
      }

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const min = Math.min(w, h);
            const size = Math.max(Math.floor(min * 0.7), 150);
            return { width: size, height: size };
          },
        },
        async (decoded) => {
          const trimmed = decoded.trim();
          setStickerCode(trimmed);
          toast.success(`Scanned Sticker: ${trimmed}`);
          await stopCamera();
          setIsScanning(false);
        },
        () => {}
      );
    } catch (err: unknown) {
      console.error("Camera error:", err);
      setCameraError("Camera unavailable. Please enter code manually below.");
      setIsScanning(false);
    }
  }, [readerId, stopCamera]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        stopCamera();
        setIsScanning(false);
      } else {
        setStickerCode(currentSticker || "");
        setCameraError(null);
      }
    },
    [currentSticker, stopCamera]
  );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleSave = (codeToSave: string | null) => {
    startTransition(async () => {
      const res = await attachStickerToVehicle(vehicleId, codeToSave);
      if (!res.success) {
        toast.error(res.error || "Failed to attach sticker.");
        return;
      }
      toast.success(
        codeToSave
          ? `Sticker ${codeToSave} attached to ${vehicleReg}!`
          : `Sticker detached from ${vehicleReg}.`
      );
      handleOpenChange(false);
      router.refresh();
    });
  };

  if (!canAttach) {
    return currentSticker ? (
      <Badge variant="outline" className="font-mono text-[11px] gap-1 bg-muted/40">
        <Tag className="w-3 h-3 text-muted-foreground" />
        {currentSticker}
      </Badge>
    ) : (
      <span className="text-xs text-muted-foreground italic">None</span>
    );
  }

  return (
    <>
      {currentSticker ? (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-mono text-xs font-semibold transition-colors cursor-pointer"
          title="Click to view or change attached sticker">
          <Tag className="w-3 h-3 shrink-0" />
          <span>{currentSticker}</span>
        </button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleOpenChange(true)}
          className="h-7 px-2.5 text-xs gap-1 border-dashed border-primary/40 text-primary hover:bg-primary/10">
          <Plus className="w-3 h-3" />
          Attach Sticker
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="w-5 h-5 text-primary" />
              Attach Physical Sticker
            </DialogTitle>
            <DialogDescription>
              Assign physical QR sticker to vehicle <strong>{vehicleReg}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Camera Viewfinder */}
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-slate-950 p-2">
              <div
                id={readerId}
                className="w-full aspect-video sm:aspect-square max-h-[220px] rounded-lg overflow-hidden flex items-center justify-center bg-black/40 text-slate-400 text-xs"
              />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 backdrop-blur-xs p-4 text-center">
                  <Camera className="w-8 h-8 text-primary/70 mb-1" />
                  <p className="text-xs text-slate-300 font-medium">
                    Point camera at the physical QR sticker
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={startCamera}
                    className="gap-1.5 mt-1 bg-primary text-primary-foreground">
                    <Camera className="w-3.5 h-3.5" />
                    Start Camera Scanner
                  </Button>
                </div>
              )}

              {isScanning && (
                <div className="absolute bottom-3 right-3 z-10">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={stopCamera}
                    className="h-7 text-xs gap-1">
                    <X className="w-3 h-3" /> Stop Camera
                  </Button>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {cameraError}
              </p>
            )}

            {/* Manual Entry */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="stickerCodeInput" className="text-xs font-semibold">
                Physical Sticker Number
              </Label>
              <div className="flex gap-2">
                <Input
                  id="stickerCodeInput"
                  placeholder="e.g. MOT-STK-00142"
                  value={stickerCode}
                  onChange={(e) => setStickerCode(e.target.value)}
                  className="font-mono text-sm uppercase"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              {currentSticker ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleSave(null)}
                  className="text-xs text-destructive hover:bg-destructive/10">
                  Detach Current Sticker
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || !stickerCode.trim()}
                  onClick={() => handleSave(stickerCode.trim())}
                  className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {isPending ? "Saving…" : "Save Sticker"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface StickerScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (code: string) => void;
  title?: string;
}

/**
 * Reusable modal for scanning stickers during vehicle creation forms.
 */
export function StickerScanModal({
  open,
  onOpenChange,
  onScanSuccess,
  title = "Scan Physical Sticker",
}: StickerScanModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerId = "form-sticker-reader-canvas";

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // ignore
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      const element = document.getElementById(readerId);
      if (!element) return;

      await stopCamera();

      const html5QrCode = new Html5Qrcode(readerId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      html5QrCodeRef.current = html5QrCode;

      let cameraConfig: string | { facingMode: string } = { facingMode: "environment" };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          cameraConfig = backCam ? backCam.id : devices[devices.length - 1].id;
        }
      } catch {}

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const min = Math.min(w, h);
            const size = Math.max(Math.floor(min * 0.7), 150);
            return { width: size, height: size };
          },
        },
        async (decoded) => {
          const trimmed = decoded.trim();
          toast.success(`Scanned Sticker: ${trimmed}`);
          await stopCamera();
          setIsScanning(false);
          onScanSuccess(trimmed);
          onOpenChange(false);
        },
        () => {}
      );
    } catch (err: unknown) {
      console.error("Camera error:", err);
      setCameraError("Camera unavailable. Please enter code manually below.");
      setIsScanning(false);
    }
  }, [readerId, onScanSuccess, onOpenChange, stopCamera]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        stopCamera();
        setIsScanning(false);
        setManualCode("");
        setCameraError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, stopCamera]
  );

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim().toUpperCase();
    handleOpenChange(false);
    onScanSuccess(code);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <QrCode className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Point your camera at the physical QR sticker or type the code below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-slate-950 p-2">
            <div
              id={readerId}
              className="w-full aspect-video sm:aspect-square max-h-[220px] rounded-lg overflow-hidden flex items-center justify-center bg-black/40 text-slate-400 text-xs"
            />
            {cameraError && (
              <p className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {cameraError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manualScanCode" className="text-xs font-semibold">
              Or Type / Paste Sticker Code
            </Label>
            <div className="flex gap-2">
              <Input
                id="manualScanCode"
                placeholder="e.g. MOT-STK-00142"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="font-mono text-sm uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
              />
              <Button type="button" onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
