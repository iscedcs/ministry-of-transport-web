"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageUp, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadGenericDocument } from "@/app/actions/upload";
import {
  compressImage,
  formatBytes,
  ImageDecodeError,
} from "@/lib/image-compress";

/**
 * Passport photograph for a Park Monitor ID card.
 *
 * Two ways in — take a photo with the device camera, or pick one from the
 * gallery — and both go through the same compression before upload, so a 5 MB
 * phone photo is stored as a ~100 KB JPEG. `capture="user"` opens the front
 * camera on phones; on a desktop it falls back to the normal file chooser.
 */
export function PassportPhotoInput({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Lets a parent form hold its submit button while a photo is in flight. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function setBusy(next: boolean) {
    setBusyState(next);
    onBusyChange?.(next);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { file: small, originalBytes, compressedBytes } =
        await compressImage(file);

      const result = await uploadGenericDocument(
        small,
        "passports",
        "PARK_MONITOR_APP",
      );
      if (!result.success) {
        setError(
          /sign|log ?in|unauthor/i.test(result.error)
            ? "Please sign in to attach a photo. You can also add it later."
            : result.error,
        );
        return;
      }

      onChange(result.url);
      setNote(
        compressedBytes < originalBytes
          ? `Reduced from ${formatBytes(originalBytes)} to ${formatBytes(compressedBytes)}`
          : null,
      );
    } catch (e) {
      setError(
        e instanceof ImageDecodeError
          ? e.message
          : "Could not upload the photo. Please try again.",
      );
    } finally {
      setBusy(false);
      // Allow picking the same file again after a failure.
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  const locked = disabled || busy;

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
            <Image
              src={value}
              alt="Passport photograph"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="flex items-center text-sm font-medium text-green-700">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Photo added
            </p>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locked}
                onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1.5 h-4 w-4" />
                Retake
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locked}
                onClick={() => galleryRef.current?.click()}>
                <ImageUp className="mr-1.5 h-4 w-4" />
                Choose another
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={locked}
                onClick={() => {
                  onChange(null);
                  setNote(null);
                }}>
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Compressing and uploading…
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                A clear, front-facing passport photograph with a plain
                background.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  disabled={locked}
                  onClick={() => cameraRef.current?.click()}>
                  <Camera className="mr-1.5 h-4 w-4" />
                  Take photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={() => galleryRef.current?.click()}>
                  <ImageUp className="mr-1.5 h-4 w-4" />
                  Upload photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WEBP. Large photos are shrunk automatically.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
