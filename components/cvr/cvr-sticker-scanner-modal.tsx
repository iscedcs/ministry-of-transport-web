"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { QrCode, Camera, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CvrStickerScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (stickerCode: string) => Promise<void> | void;
  vehiclePlate?: string;
}

export function CvrStickerScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  vehiclePlate,
}: CvrStickerScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);
  const isProcessingRef = useRef(isProcessing);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onCloseRef.current = onClose;
    isProcessingRef.current = isProcessing;
  }, [onScanSuccess, onClose, isProcessing]);

  const readerDivId = "cvr-qr-reader-canvas";

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // ignore stop error
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraStarting(true);

    try {
      const element = document.getElementById(readerDivId);
      if (!element) return;

      await stopCamera();

      const html5QrCode = new Html5Qrcode(readerDivId, {
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
          if (backCam) {
            cameraConfig = backCam.id;
          } else {
            cameraConfig = devices[devices.length - 1].id;
          }
        }
      } catch {
        // fallback to facingMode: environment
      }

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(Math.floor(minEdge * 0.7), 150);
            return {
              width: Math.min(size, viewfinderWidth),
              height: Math.min(size, viewfinderHeight),
            };
          },
          disableFlip: false,
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          setIsProcessing(true);

          toast.success(`Sticker scanned: ${decodedText}`);

          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
          } catch {
            // ignore
          }

          try {
            await onScanSuccessRef.current(decodedText.trim());
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to record sticker.");
          } finally {
            setIsProcessing(false);
            onCloseRef.current();
          }
        },
        () => {
          // Frame error - expected when QR is not in frame
        }
      );
    } catch (err: unknown) {
      console.error("Camera start error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access camera. Grant permissions or type code below.";
      setCameraError(msg);
    } finally {
      setIsCameraStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleModalClose = () => {
    setCameraError(null);
    setManualCode("");
    stopCamera();
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error("Please enter a valid sticker number.");
      return;
    }

    setIsProcessing(true);
    try {
      await stopCamera();
      await onScanSuccess(manualCode.trim());
      handleModalClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save sticker.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-emerald-800/40 text-slate-100 shadow-2xl p-6 rounded-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Scan Commercial Vehicle Sticker
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {vehiclePlate
                  ? `Scanning sticker for plate ${vehiclePlate}`
                  : "Scan the physical sticker barcode/QR with your device camera"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500/40 bg-slate-900/90 p-2 min-h-[260px] flex flex-col items-center justify-center">
            {cameraError ? (
              <div className="text-center p-6 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300 max-w-xs mx-auto">{cameraError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs gap-1.5 rounded-xl cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </Button>
              </div>
            ) : (
              <div
                id={readerDivId}
                className="w-full rounded-xl overflow-hidden text-slate-900"
                style={{ minHeight: 280 }}
              />
            )}

            {isCameraStarting && !cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-emerald-400 text-xs font-medium">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Opening Camera Stream...</span>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-8 h-8 animate-bounce text-emerald-400" />
                <span>Attaching Sticker...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="manualSticker" className="text-xs text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Or type sticker number manually
              </Label>
              <div className="flex gap-2">
                <Input
                  id="manualSticker"
                  placeholder="e.g. MOT-CVR-00492 or scan code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={isProcessing || !manualCode.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 flex-shrink-0 cursor-pointer"
                >
                  Set Sticker
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
