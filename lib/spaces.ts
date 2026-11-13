/**
 * DigitalOcean Spaces upload utility — Ministry of Transport Platform
 *
 * S3-compatible object storage for CAC and land ownership documents.
 * Keys are read from env: DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_ENDPOINT,
 * DO_SPACES_BUCKET, DO_SPACES_REGION, DO_SPACES_STORAGE_PREFIX,
 * DO_SPACES_PUBLIC_BASE
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT!,
  region: process.env.DO_SPACES_REGION!,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET!;
const PREFIX = process.env.DO_SPACES_STORAGE_PREFIX ?? "mot-documents";
const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE!;

/** Allowed MIME types for CAC / land ownership documents */
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadResult {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
}

/**
 * Upload a File/Blob to DO Spaces.
 * Returns the public URL and metadata.
 */
export async function uploadDocument(
  file: File,
  folder: string,
  customPrefix?: string,
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Only PDF, JPEG, PNG and WEBP files are accepted.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File must be smaller than 5 MB.");
  }

  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const prefixToUse = customPrefix ?? PREFIX;
  const key = `${prefixToUse}/${folder}/${randomUUID()}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
      ContentLength: file.size,
      ACL: "public-read",
    }),
  );

  return {
    url: `${PUBLIC_BASE}/${key}`,
    key,
    fileName: file.name,
    fileSize: file.size,
    fileMimeType: file.type,
  };
}

/**
 * The browser shrinks every ID photograph to ~100 KB before uploading
 * (lib/image-compress.ts). This ceiling is the backstop for a client that
 * skipped that step — an old cached page, a direct call — so storage cannot
 * quietly fill with multi-megabyte originals.
 */
const PASSPORT_MAX_BYTES = 1024 * 1024; // 1 MB

/**
 * Upload a Photo specifically to the Park Monitor bucket prefix.
 */
export async function uploadParkMonitorPhoto(
  file: File,
): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("The photograph must be an image.");
  }
  if (file.size > PASSPORT_MAX_BYTES) {
    throw new Error(
      "This photo is too large. Retake it or choose a smaller one — it is normally shrunk automatically.",
    );
  }
  return uploadDocument(file, "passports", process.env.DO_SPACES_STORAGE_PREFIX || "mot-anambra-park-monitor-images");
}

/** True when `url` points at our own object storage. */
export function isOwnStorageUrl(url: string): boolean {
  const base = process.env.DO_SPACES_PUBLIC_BASE;
  return !!base && url.startsWith(`${base}/`);
}
