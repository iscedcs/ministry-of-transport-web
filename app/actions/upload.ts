"use server";

/**
 * Document upload server action — Ministry of Transport Platform
 *
 * Accepts a FormData with a `file` field, uploads to DO Spaces,
 * creates a Document record in the DB, and returns the document ID + URL.
 */

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadDocument } from "@/lib/spaces";

export type UploadActionResult =
  | { success: true; documentId: string; url: string }
  | { success: false; error: string };

export async function uploadCacDocument(
  formData: FormData,
): Promise<UploadActionResult> {
  const session = await requireAuth();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided." };
  }

  let uploaded;
  try {
    uploaded = await uploadDocument(file, "cac");
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }

  const doc = await db.document.create({
    data: {
      uploadedByUserId: session.userId,
      fileName: uploaded.fileName,
      fileType: uploaded.fileMimeType.split("/")[1] ?? "bin",
      fileSize: uploaded.fileSize,
      fileUrl: uploaded.url,
      fileMimeType: uploaded.fileMimeType,
      linkedToType: "MOTOR_PARK",
      linkedToId: "pending", // updated after MotorPark record is created
    },
    select: { id: true },
  });

  return { success: true, documentId: doc.id, url: uploaded.url };
}
