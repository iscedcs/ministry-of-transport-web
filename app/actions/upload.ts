export type UploadActionResult =
  | { success: true; documentId: string; url: string }
  | { success: false; error: string };

/**
 * Document upload client wrapper — Ministry of Transport Platform
 *
 * Calls `/api/upload` route handler which supports larger payloads (up to 5MB)
 * bypassing Server Action limits.
 */
export async function uploadCacDocument(
  formData: FormData,
): Promise<UploadActionResult> {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Upload failed with status ${res.status}`,
      };
    }

    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

